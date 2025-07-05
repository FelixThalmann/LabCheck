/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import * as mqtt from 'mqtt';
import { MqttClient, IClientOptions } from 'mqtt';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { EventsGateway } from '../../events/events/events.gateway';
import { EventType, Sensor, Room } from '@prisma/client';
import { OccupancyService } from '../../occupancy/services/occupancy.service';
import { RoomManagementService } from '../../occupancy/services/room-management.service';

// Dynamic topic patterns for ESP32 ID-based topics
const DYNAMIC_TOPIC_PATTERNS = {
  DOOR: 'labcheck/esp32/door',        // labcheck/{esp32Id}/door
  ENTRANCE: 'labcheck/esp32/entrance', // labcheck/{esp32Id}/entrance
};

/**
 * @class MqttIngestionService
 * @description Service responsible for connecting to an MQTT broker, subscribing to topics,
 * ingesting messages, validating them, processing them, and storing relevant data.
 * It also forwards events to other parts of the application, like WebSockets.
 * Implements NestJS lifecycle hooks for initialization and destruction.
 */
@Injectable()
export class MqttIngestionService implements OnModuleInit, OnModuleDestroy {
  /**
   * @private
   * @readonly
   * @type {Logger}
   * @description Logger instance for this service.
   */
  private readonly logger = new Logger(MqttIngestionService.name);
  /**
   * @private
   * @type {MqttClient}
   * @description The MQTT client instance used to connect to the broker.
   */
  private client: MqttClient;

  /**
   * @constructor
   * @param {ConfigService} configService - Service for accessing configuration variables.
   * @param {PrismaService} prismaService - Service for database interactions.
   * @param {EventsGateway} eventsGateway - Gateway for sending real-time updates via WebSockets.
   * @param {OccupancyService} occupancyService - Service for room occupancy management.
   * @param {RoomManagementService} roomManagementService - Service for automatic room assignment.
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly eventsGateway: EventsGateway, // Injected
    private readonly occupancyService: OccupancyService, // Injected for room occupancy management
    private readonly roomManagementService: RoomManagementService, // Injected for automatic room assignment
  ) {}

  /**
   * @method onModuleInit
   * @description NestJS lifecycle hook. Called once the host module has been initialized.
   * Initializes the MQTT client, connects to the broker, and subscribes to relevant topics.
   * Sets up event handlers for 'connect', 'message', 'error', and 'close'.
   * @returns {void}
   */
  onModuleInit(): void {
    // Hole die Broker-URL und baue die MQTT-Options zusammen (inkl. zufälliger Client-ID)
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL');
    const mqttOptions: IClientOptions = {
      clientId: `nest-mqtt-ingestion-client-${Math.random().toString(16).substring(2, 8)}`,
      // Weitere Standardoptionen bei Bedarf:
      // keepalive: 60,
      // reconnectPeriod: 1000, // Millisekunden bis zum nächsten Verbindungsversuch
      // connectTimeout: 30 * 1000, // Millisekunden
      // clean: true, // Bei false werden Subscriptions und Offline-Nachrichten (QoS > 0) beibehalten
    };
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');

    // Setze Username/Passwort, falls vorhanden
    if (username) mqttOptions.username = username;
    if (password) mqttOptions.password = password;

    // Falls keine Broker-URL konfiguriert ist, beende Initialisierung
    if (!brokerUrl) {
      this.logger.error('MQTT_BROKER_URL is not defined. MQTT ingestion service will not start.');
      return;
    }

    this.logger.log(`Attempting to connect to MQTT broker at ${brokerUrl} with client ID ${mqttOptions.clientId}`);
    // Verbindungsaufbau zum MQTT-Broker
    this.client = mqtt.connect(brokerUrl, mqttOptions);
   

    // Event-Handler: Verbindung erfolgreich aufgebaut
    this.client.on('connect', () => {
      this.logger.log(`Successfully connected to MQTT broker at ${brokerUrl}`);
      // Definiere die zu abonnierenden Topics (mit Beschreibung)
      const topicsToSubscribe = [
        { name: DYNAMIC_TOPIC_PATTERNS.DOOR, description: 'Door sensor events with ESP32 ID' },
        { name: DYNAMIC_TOPIC_PATTERNS.ENTRANCE, description: 'Entrance sensor events with ESP32 ID' },
      ];

      // Abonniere alle Topics aus obiger Liste
      topicsToSubscribe.forEach(topicInfo => {
        this.client.subscribe(topicInfo.name, (err) => {
          if (err) {
            this.logger.error(`Failed to subscribe to topic '${topicInfo.name}' (${topicInfo.description}). Error: ${err.message}`);
          } else {
            this.logger.log(`Successfully subscribed to topic '${topicInfo.name}' (${topicInfo.description})`);
          }
        });
      });
    });

    
    // Event-Handler: Nachricht empfangen
    this.client.on('message', async (topic: string, payload: Buffer) => {
      const messageContent = payload.toString();
      this.logger.debug(`Received raw message on topic '${topic}': "${messageContent}"`);


      // Check for dynamic ESP32 ID-based topics first (labcheck/{esp32Id}/{eventType})
      const topicParts = topic.split('/');
      if (topicParts.length === 3 && topicParts[0] === 'labcheck') {
        const esp32Id = topicParts[1];
        const eventType = topicParts[2];
        
        if (esp32Id && eventType) {
          this.logger.verbose(`Processing dynamic topic - ESP32 ID: '${esp32Id}', Event: '${eventType}' from topic '${topic}'.`);
          
          switch (eventType) {
            case 'door':
              // Simple door status: "1" = open, "0" = closed
              await this.handleSimpleDoorEvent(esp32Id, messageContent);
              break;
            case 'entrance':
              // Entrance/Exit events: "1" = IN, "0" = OUT
              await this.handleLightBarrierEvent(esp32Id, messageContent);
              break;
            case 'status':
              // General status messages
              await this.handleGeneralStatusEvent(esp32Id, messageContent);
              break;
            default:
              this.logger.warn(`Unknown event type '${eventType}' for ESP32 ID '${esp32Id}' on topic '${topic}'. Message ignored.`);
          }
          return; // Exit early after processing
        }
      }

      // If we reach here, the topic format is not recognized
      this.logger.warn(`Message received on unhandled topic: '${topic}'. Message: "${messageContent}". Message ignored.`);
    });

    // Fehler-Handler für den MQTT-Client
    this.client.on('error', (error: Error) => {
      this.logger.error(`MQTT client error: ${error.message}`, error.stack);
    });

    // Reconnect-Handler
    this.client.on('reconnect', () => {
      this.logger.log('MQTT client is attempting to reconnect...');
    });

    // Offline-Handler
    this.client.on('offline', () => {
      this.logger.warn('MQTT client went offline.');
    });

    // Verbindungsabbruch-Handler
    this.client.on('close', () => {
      this.logger.log('MQTT client disconnected.'); // Reconnect-Logik wird meist von mqtt.js selbst übernommen
    });
  }

  /**
   * @method onModuleDestroy
   * @description NestJS lifecycle hook. Called once the host module will be destroyed.
   * Closes the MQTT client connection if it exists.
   * @returns {void}
   */
  onModuleDestroy(): void {
    if (this.client) {
      this.logger.log('Closing MQTT client connection...');
      this.client.end(true, (error) => { 
        if (error) {
            this.logger.error('Error while closing MQTT client connection:', error);
        } else {
            this.logger.log('MQTT client connection closed successfully.');
        }
      });
    }
  }

  /**
   * @private
   * @async
   * @method getSensor
   * @description Retrieves a sensor from the database based on its ESP32 ID.
   * If the sensor is not found, a new sensor record is created with a default location.
   * @param {string} esp32Id - The ESP32 ID of the sensor.
   * @returns {Promise<Sensor & { room: Room | null } | null>} A promise that resolves to the sensor object with room information.
   * @throws Error if database operation fails.
   */
  private async getSensor(esp32Id: string): Promise<(Sensor & { room: Room | null }) | null> {
    if (!esp32Id || typeof esp32Id !== 'string' || esp32Id.trim() === '') {
        this.logger.error('Invalid esp32Id (empty or not a string) provided to getSensor. Cannot process sensor operation.');
        return null; // Return null instead of throwing to allow handler to decide
    }
    
    this.logger.verbose(`Attempting to find sensor with ESP32 ID '${esp32Id}'.`);
    let sensor = await this.prismaService.sensor.findUnique({
      where: { esp32Id },
      include: { room: true }, // Include room for verification
    });

    if (!sensor) {
      this.logger.log(`Sensor with ESP32 ID '${esp32Id}' not found. Creating new sensor with auto-room assignment.`);
      try {
        // Get default room first for automatic assignment
        const defaultRoom = await this.roomManagementService.ensureDefaultRoomExists();
        
        sensor = await this.prismaService.sensor.create({
          data: { 
            esp32Id, 
            location: `Auto-created for ESP32: ${esp32Id}`,
            roomId: defaultRoom.id  // Automatic room assignment
          },
          include: { room: true }
        });
        this.logger.log(`Successfully created sensor with DB ID ${sensor.id} for ESP32 ID '${esp32Id}' and assigned to room '${defaultRoom.name}' (${defaultRoom.id}).`);
      } catch (dbError) {
        this.logger.error(`Failed to create new sensor for ESP32 ID '${esp32Id}'. Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`, dbError instanceof Error ? dbError.stack : undefined);
        return null; // Return null on creation failure
      }
    } else {
      this.logger.verbose(`Found existing sensor with DB ID ${sensor.id} for ESP32 ID '${esp32Id}'.`);
      
      // Check if sensor has room assignment, if not assign to default room
      if (!sensor.roomId) {
        this.logger.log(`Sensor ${esp32Id} exists but has no room assignment. Assigning to default room.`);
        const assignedRoom = await this.roomManagementService.assignSensorToDefaultRoom(sensor.id);
        if (assignedRoom) {
          // Reload sensor with room information
          sensor = await this.prismaService.sensor.findUnique({
            where: { id: sensor.id },
            include: { room: true }
          });
          this.logger.log(`Successfully assigned existing sensor ${esp32Id} to default room '${assignedRoom.name}' (${assignedRoom.id}).`);
        } else {
          this.logger.error(`Failed to assign sensor ${esp32Id} to default room.`);
        }
      } else {
        this.logger.verbose(`Sensor ${esp32Id} is already assigned to room ${sensor.roomId}.`);
      }
    }
    return sensor;
  }

  /**
   * @private
   * @async
   * @method validateAndLogErrors
   * @description Validates the incoming data against a specified DTO class.
   * Logs any validation errors and returns null if validation fails.
   * @template T Extends a plain object.
   * @param {unknown} data - The raw data to validate.
   * @param {new () => T} DtoClass - The DTO class constructor to validate against.
   * @param {string} sensorEsp32Id - The ESP32 ID of the sensor from which the data originated.
   * @param {string} eventType - The type of event being validated (e.g., 'door', 'passage').
   * @returns {Promise<T | null>} A promise that resolves to the validated DTO instance or null if validation fails.
   */
  private async validateAndLogErrors<T extends object>(
    data: unknown,
    DtoClass: new () => T,
    sensorEsp32Id: string,
    eventType: string
  ): Promise<T | null> {
    // Logge, dass die Validierung für diesen Event-Typ und diese Sensor-ID beginnt
    this.logger.verbose(`Validiere ${eventType}-Event-Daten für ESP32 ID '${sensorEsp32Id}'.`);
    
    // Prüfe, ob die Daten ein Objekt sind (und nicht null)
    if (typeof data !== 'object' || data === null) {
      this.logger.warn(
        `Validierung fehlgeschlagen für ${eventType}-Event von ESP32 ID '${sensorEsp32Id}': Daten sind kein Objekt. Empfangen: ${JSON.stringify(data)}. Event wird ignoriert.`
      );
      return null;
    }

    // Wandle die Rohdaten in eine Instanz der DTO-Klasse um
    const dtoInstance = plainToClass(DtoClass, data);

    // Führe die Validierung der Instanz durch (asynchron)
    const errors: ValidationError[] = await validate(dtoInstance);

    // Falls Fehler auftreten, logge alle Fehlermeldungen und gib null zurück
    if (errors.length > 0) {
      const errorMessages = errors
        .map(err => Object.values(err.constraints || {}).join(', '))
        .join('; ');
      this.logger.warn(
        `Validierung fehlgeschlagen für ${eventType}-Event von ESP32 ID '${sensorEsp32Id}': ${errorMessages}. Daten: ${JSON.stringify(data)}. Event wird ignoriert.`
      );
      return null;
    }

    // Validierung erfolgreich, logge dies und gib die Instanz zurück
    this.logger.verbose(
      `Validierung erfolgreich für ${eventType}-Event-Daten von ESP32 ID '${sensorEsp32Id}'.`
    );
    return dtoInstance;
  }

  /**
   * @private
   * @async
   * @method handleSimpleDoorEvent
   * @description Handles simple door status events from dynamic topics.
   * The payload is expected to be a simple string "1" (door open) or "0" (door closed).
   * Updates both the DoorEvent table and the Room's isOpen status using the same sensor-to-room logic.
   * @param {string} esp32Id - The ESP32 ID of the sensor.
   * @param {string} statusPayload - The raw string payload ("1" or "0").
   * @returns {Promise<void>}
   */
  private async handleSimpleDoorEvent(esp32Id: string, statusPayload: string): Promise<void> {
    this.logger.debug(`Processing simple door event from ESP32 ID '${esp32Id}'. Payload: "${statusPayload}"`);

    // Prüfe, ob das Payload gültig ist (nur "1" oder "0" sind erlaubt)
    if (statusPayload !== '1' && statusPayload !== '0') {
      this.logger.warn(`Invalid status payload for door event '${esp32Id}': "${statusPayload}". Expected '1' or '0'. Event ignored.`);
      return;
    }

    // Mappe das Payload auf Door Status: "1" = open, "0" = closed
    const isOpen = statusPayload === '1';

    // Versuche, den Sensor anhand der ESP32-ID aus der Datenbank zu holen (oder ggf. anzulegen)
    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
      this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. Door event cannot be stored.`);
      return;
    }

    try {
      // 1. Speichere das DoorEvent in der Datenbank
      this.logger.verbose(`Attempting to store DoorEvent for sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), isOpen: ${isOpen}.`);
      
      // Get last event for this sensor to get the personCount
      const lastEvent = await this.prismaService.event.findFirst({
        where: { sensorId: sensor.id },
        orderBy: { timestamp: 'desc' },
      });
      const personCount = lastEvent?.personCount ?? 0;
      
      const createdEvent = await this.prismaService.event.create({
        data: {
          timestamp: new Date(),
          personCount: personCount,
          isDoorOpen: isOpen,
          eventType: EventType.DOOR_EVENT,
          sensorId: sensor.id,
          roomId: sensor.roomId,
        },
      });
      
      this.logger.log(`Successfully stored DoorEvent: ID ${createdEvent.id} (isOpen: ${isOpen}) for sensor ${sensor.esp32Id}.`);

      // 2. Aktualisiere den Room-Status eindeutig mit der gleichen Sensor-zu-Raum-Logik
      if (this.occupancyService) {
        this.logger.verbose(`Updating room open status after door event ID ${createdEvent.id}.`);
        const roomUpdate = await this.occupancyService.updateRoomOpenStatus(sensor.id, isOpen);
        
        if (roomUpdate) {
          this.logger.log(`Successfully updated room '${roomUpdate.roomName}' (${roomUpdate.roomId}) status to isOpen: ${roomUpdate.isOpen}`);
        } else {
          this.logger.warn(`Failed to update room status for sensor ${sensor.esp32Id}. Room may not be assigned.`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process door event for ESP32 ID '${esp32Id}'. Payload: "${statusPayload}". Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * @private
   * @async
   * @method handleGeneralStatusEvent
   * @description Handles general status messages from ESP32 devices.
   * @param {string} esp32Id - The ESP32 ID of the sensor.
   * @param {string} statusPayload - The raw string payload.
   * @returns {Promise<void>}
   */
  private async handleGeneralStatusEvent(esp32Id: string, statusPayload: string): Promise<void> {
    this.logger.debug(`Processing general status event from ESP32 ID '${esp32Id}'. Payload: "${statusPayload}"`);

    // Versuche, den Sensor anhand der ESP32-ID aus der Datenbank zu holen (oder ggf. anzulegen)
    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
      this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. Status event cannot be processed.`);
      return;
    }

    // Log das Status-Event für Monitoring (ohne Speicherung in der DB)
    this.logger.log(`Status message from sensor ${sensor.esp32Id}: "${statusPayload}"`);
    
    // Optional: Hier könnte eine spezifische Logik für verschiedene Status-Messages implementiert werden
    // z.B. WiFi-Status, Battery-Level, Sensor-Health, etc.
  }

  /**
   * @private
   * @async
   * @method handleLightBarrierEvent
   * @description Handles incoming light barrier event data from an MQTT message.
   * The payload is expected to be a simple string "1" (person entering) or "0" (person exiting).
   * Stores the data as PassageEvent with direction mapping: "1" -> IN, "0" -> OUT.
   * @param {string} esp32Id - The ESP32 ID of the sensor, extracted from the topic.
   * @param {string} statusPayload - The raw string payload ("1" or "0").
   * @returns {Promise<void>}
   */
  private async handleLightBarrierEvent(esp32Id: string, statusPayload: string): Promise<void> {
    // Logge, dass ein Passage-Event über Lichtschranke verarbeitet wird, inkl. ESP32-ID und Payload
    this.logger.debug(`Processing 'light barrier passage' event from ESP32 ID '${esp32Id}'. Payload: "${statusPayload}"`);

    // Prüfe, ob das Payload gültig ist (nur "1" oder "0" sind erlaubt)
    if (statusPayload !== '1' && statusPayload !== '0') {
      // Falls ungültig, schreibe Warnung ins Log und breche ab
      this.logger.warn(`Invalid status payload for light barrier passage '${esp32Id}': "${statusPayload}". Expected '1' or '0'. Event ignored.`);
      return;
    }

    // Mappe das Payload auf PassageDirection: "1" = IN (Person betritt Raum), "0" = OUT (Person verlässt Raum)
    const direction = statusPayload === '1' ? 'IN' : 'OUT';

    // Versuche, den Sensor anhand der ESP32-ID aus der Datenbank zu holen (oder ggf. anzulegen)
    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
        // Falls kein Sensor gefunden/angelegt werden konnte, logge Fehler und breche ab
        this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. 'light barrier passage' event cannot be stored.`);
        return;
    }

    try {
      // Versuche, das PassageEvent in der Datenbank zu speichern
      this.logger.verbose(`Attempting to store PassageEvent for sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), direction: ${direction}.`);

      // Get last event for this sensor to get the personCount
      const lastEvent = await this.prismaService.event.findFirst({
        where: { sensorId: sensor.id },
        orderBy: { timestamp: 'desc' },
      });
      const personCount = lastEvent?.personCount ?? 0;

      // Get entrance direction
      const entranceDirection = sensor.room?.entranceDirection ?? 'left';

      // Update personCount based on direction
      let newPersonCount = personCount;
      if (entranceDirection === 'left') {
        newPersonCount = direction === 'IN' ? personCount + 1 : personCount - 1;
      } else {
        newPersonCount = direction === 'OUT' ? personCount - 1 : personCount + 1;
      }

      const createdEvent = await this.prismaService.event.create({
        data: {
          timestamp: new Date(),  // Aktueller Zeitstempel
          personCount: newPersonCount,
          eventType: EventType.PASSAGE_EVENT,
          isDoorOpen: lastEvent?.isDoorOpen ?? false,
          sensorId: sensor.id,         // Referenz auf den Sensor
          roomId: sensor.roomId,
        },
      });
      
      // Logge, dass das Event erfolgreich gespeichert wurde
      this.logger.log(`Successfully stored PassageEvent: ID ${createdEvent.id} (direction: ${direction}) for sensor ${sensor.esp32Id}.`);

      // Aktualisiere die Raumbelegung automatisch basierend auf der Passage-Richtung
      if (this.occupancyService) {
        this.logger.verbose(`Updating room occupancy after passage event ID ${createdEvent.id}.`);
        await this.occupancyService.updateRoomOccupancy(sensor.id, direction);
      }
    } catch (error) {
      // Fehler beim Speichern oder beim Senden des Updates werden geloggt
      this.logger.error(`Failed to process light barrier passage event for ESP32 ID '${esp32Id}'. Payload: "${statusPayload}". Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
