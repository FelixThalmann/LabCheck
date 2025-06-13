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
import { MqttDoorDataDto, MqttPassageDataDto, MqttMotionDataDto } from '../dto';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { EventsGateway } from '../../events/events/events.gateway';
import { Sensor } from '@prisma/client';
import { OccupancyService } from '../../occupancy/services/occupancy.service';


const JSON_BASED_EVENTS_TOPIC_PREFIX = 'uni/lab/door/';
const LIGHT_BARRIER_TOPIC_PREFIX = 'sensor/lichtschranke/';
const LIGHT_BARRIER_TOPIC_SUFFIX = '/status';

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
   * @param {DoorService} doorService - Service for door-related logic, including occupancy calculation.
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly eventsGateway: EventsGateway, // Injected
    private readonly occupancyService: OccupancyService, // Injected for room occupancy management
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
        { name: `${JSON_BASED_EVENTS_TOPIC_PREFIX}+/events`, description: 'JSON-based sensor events' }, 
        { name: `${LIGHT_BARRIER_TOPIC_PREFIX}`, description: 'Light barrier status events' }
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

      // Prüfe, ob es sich um ein Lichtschranken-Topic handelt
      if (topic.startsWith(LIGHT_BARRIER_TOPIC_PREFIX)) {
        // Extrahiere die ESP32-ID aus dem Topic (zwischen Prefix und Suffix)
        const esp32IdFromTopic = topic.substring(LIGHT_BARRIER_TOPIC_PREFIX.length, topic.length - LIGHT_BARRIER_TOPIC_SUFFIX.length);
        // Stelle sicher, dass die ID gültig ist (kein weiteres "/" enthalten)
        if (esp32IdFromTopic && !esp32IdFromTopic.includes('/')) {
          this.logger.verbose(`Extracted ESP32 ID '${esp32IdFromTopic}' from light barrier topic '${topic}'.`);
          await this.handleLightBarrierEvent(esp32IdFromTopic, messageContent);
        } else {
          this.logger.warn(`Malformed topic for light barrier: '${topic}'. Expected format '${LIGHT_BARRIER_TOPIC_PREFIX}{sensorId}${LIGHT_BARRIER_TOPIC_SUFFIX}'. Extracted ID part: '${esp32IdFromTopic}'. Message ignored.`);
        }
      } 
      // Prüfe, ob es sich um ein JSON-basiertes Event-Topic handelt
      else if (topic.startsWith(JSON_BASED_EVENTS_TOPIC_PREFIX)) { 
        // Zerlege das Topic in Teile, um die ESP32-ID zu extrahieren
        const topicParts = topic.split('/');
        // uni/lab/door/{sensorId}/events -> sensorId ist an Index 3
        const esp32IdFromTopic = topicParts[3]; 

        if (!esp32IdFromTopic) {
          this.logger.warn(`Could not extract ESP32 ID from JSON-based event topic: '${topic}'. Message ignored.`);
          return;
        }
        this.logger.verbose(`Extracted ESP32 ID '${esp32IdFromTopic}' from JSON-based topic '${topic}'.`);

        try {
          // Versuche, die empfangene Nachricht als JSON zu parsen
          const rawMessage = JSON.parse(messageContent);
          this.logger.debug(`THIS IS THE RAW MESSAGE: ${JSON.stringify(rawMessage)}`);
          this.logger.verbose(`Successfully parsed JSON message from ESP32 ID '${esp32IdFromTopic}'. Type: '${rawMessage?.type}'.`);

          // Überprüfe, ob die Nachricht die erwarteten Felder enthält
          if (!rawMessage || typeof rawMessage.type !== 'string' || typeof rawMessage.data === 'undefined') {
              this.logger.warn(`Message from ESP32 ID '${esp32IdFromTopic}' (topic: '${topic}') is missing 'type' or 'data' field, or they have incorrect type. Payload: "${messageContent}". Message ignored.`);
              return;
          }

          // Verarbeite die Nachricht je nach Typ
          switch (rawMessage.type) {
            case 'door':
              await this.handleDoorEvent(esp32IdFromTopic, rawMessage.data);
              break;
            case 'passage':
              await this.handlePassageEvent(esp32IdFromTopic, rawMessage.data);
              break;
            case 'motion':
              await this.handleMotionEvent(esp32IdFromTopic, rawMessage.data);
              break;
            default:
              this.logger.warn(`Unknown message type '${rawMessage.type}' received from ESP32 ID '${esp32IdFromTopic}' (topic: '${topic}'). Message ignored.`);
          }
        } catch (error) {
          // Fehler beim Parsen oder Verarbeiten der Nachricht
          if (error instanceof SyntaxError) {
            this.logger.error(`Failed to parse JSON message from ESP32 ID '${esp32IdFromTopic}' (topic: '${topic}'): "${messageContent}". Error: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Failed to process JSON-based MQTT message from ESP32 ID '${esp32IdFromTopic}' (topic: '${topic}'). Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
          }
        }
      } 
      // Alle anderen Topics werden ignoriert
      else {
        this.logger.warn(`Message received on unhandled topic: '${topic}'. Message: "${messageContent}". Message ignored.`);
      }
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
   * @returns {Promise<Sensor>} A promise that resolves to the sensor object.
   * @throws Error if database operation fails.
   */
  private async getSensor(esp32Id: string): Promise<Sensor | null> {
    if (!esp32Id || typeof esp32Id !== 'string' || esp32Id.trim() === '') {
        this.logger.error('Invalid esp32Id (empty or not a string) provided to getSensor. Cannot process sensor operation.');
        return null; // Return null instead of throwing to allow handler to decide
    }
    
    this.logger.verbose(`Attempting to find sensor with ESP32 ID '${esp32Id}'.`);
    let sensor = await this.prismaService.sensor.findUnique({
      where: { esp32Id },
    });

    if (!sensor) {
      this.logger.log(`Sensor with ESP32 ID '${esp32Id}' not found. Attempting to create new sensor entry.`);
      try {
        sensor = await this.prismaService.sensor.create({
          data: { esp32Id, location: 'Unknown - Auto-created by MqttIngestionService' },
        });
        this.logger.log(`Successfully created and retrieved new sensor with DB ID ${sensor.id} for ESP32 ID '${esp32Id}'.`);
      } catch (dbError) {
        this.logger.error(`Failed to create new sensor for ESP32 ID '${esp32Id}'. Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`, dbError instanceof Error ? dbError.stack : undefined);
        return null; // Return null on creation failure
      }
    } else {
      this.logger.verbose(`Found existing sensor with DB ID ${sensor.id} for ESP32 ID '${esp32Id}'.`);
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
  /**
   * Validiert eingehende Event-Daten gegen ein DTO und loggt ggf. Fehler.
   * 
   * Technischer Ablauf:
   * - Die Methode erhält rohe Daten (z.B. aus MQTT), eine DTO-Klasse, die ESP32-ID des Sensors und den Event-Typ.
   * - Zuerst wird geprüft, ob die Daten ein Objekt sind (und nicht null). Falls nicht, wird ein Warn-Log geschrieben und null zurückgegeben.
   * - Die Daten werden mittels class-transformer in eine Instanz der angegebenen DTO-Klasse umgewandelt.
   * - Mit class-validator wird die Instanz asynchron validiert. Das Ergebnis ist ein Array von ValidationError-Objekten.
   * - Falls Validierungsfehler auftreten, werden alle Fehlermeldungen extrahiert, geloggt und null zurückgegeben.
   * - Bei erfolgreicher Validierung wird ein Erfolgs-Log geschrieben und die validierte DTO-Instanz zurückgegeben.
   * 
   * Vorteil: Die Methode kapselt Validierung und Fehlerlogging, sodass die aufrufende Logik sich nur um das Ergebnis kümmern muss.
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
   * @method handleDoorEvent
   * @description Verarbeitet eingehende Tür-Event-Daten aus einer MQTT-Nachricht.
   * @param {string} esp32Id - Die ESP32-ID des Sensors.
   * @param {unknown} data - Das rohe Daten-Payload für das Tür-Event.
   * @returns {Promise<void>}
   */
  private async handleDoorEvent(esp32Id: string, data: unknown): Promise<void> {
    // Debug-Log: Zeigt an, dass ein Tür-Event verarbeitet wird, inkl. Rohdaten
    this.logger.debug(`Verarbeite 'door'-Event von ESP32 ID '${esp32Id}'. Rohdaten: ${JSON.stringify(data)}`);

    // Validierung der empfangenen Daten gegen das DoorDataDto
    const validatedData = await this.validateAndLogErrors(data, MqttDoorDataDto, esp32Id, 'door');
    if (!validatedData) {
      // Falls die Validierung fehlschlägt, wurde der Fehler bereits geloggt und die Verarbeitung wird abgebrochen
      return;
    }

    // Sensor anhand der ESP32-ID aus der Datenbank holen (oder ggf. anlegen)
    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
      // Wenn kein Sensor gefunden oder angelegt werden konnte, Fehler loggen und abbrechen
      this.logger.error(`Konnte keinen Sensor für ESP32 ID '${esp32Id}' finden oder anlegen. 'door'-Event kann nicht gespeichert werden.`);
      return;
    }

    try {
      // Log: Versuch, das DoorEvent in der Datenbank zu speichern
      this.logger.verbose(`Speichere DoorEvent für Sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), isOpen: ${validatedData.isOpen}.`);
      // DoorEvent in der Datenbank anlegen
      const createdEvent = await this.prismaService.doorEvent.create({
        data: {
          sensorId: sensor.id,
          // Nutze den übermittelten Zeitstempel, falls vorhanden, sonst aktuellen Zeitpunkt
          eventTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
          doorIsOpen: validatedData.isOpen,
        },
      });
      // Log: Erfolgreiches Speichern des Events
      this.logger.log(`DoorEvent erfolgreich gespeichert: ID ${createdEvent.id} für Sensor '${sensor.esp32Id}' (isOpen: ${validatedData.isOpen}).`);
      // Falls ein EventsGateway existiert, sende ein WebSocket-Update

      ///////// WEBSOCKET IMPLEMENTATION HERE /////////
      /*if (this.eventsGateway) {
        this.logger.verbose(`Sende Türstatus-Update via WebSocket für Event ID ${createdEvent.id}.`);
        this.eventsGateway.sendDoorStatusUpdate(createdEvent); // MAYBE LATER HERE TO SEND REAL TIME UPDATES VIA WEBSOCKETS
      }*/
    } catch (error) {
      // Fehler beim Speichern des Events in der Datenbank
      this.logger.error(
        `Fehler beim Speichern des DoorEvents für Sensor '${sensor.esp32Id}'. Daten: ${JSON.stringify(validatedData)}. Fehler: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * @private
   * @async
   * @method handlePassageEvent
   * Diese Methode verarbeitet eingehende Passage-Events, die über MQTT empfangen werden.
   * Sie übernimmt die Validierung, Speicherung und ggf. das Senden von WebSocket-Updates.
   * 
   * Technische Ablaufbeschreibung:
   * 1. Die Methode erhält die ESP32-ID des Sensors und die Rohdaten des Passage-Events.
   * 2. Die Rohdaten werden gegen das erwartete DTO (MqttPassageDataDto) validiert.
   *    - Falls die Validierung fehlschlägt, wird abgebrochen (Fehler wurde bereits geloggt).
   * 3. Es wird versucht, den zugehörigen Sensor anhand der ESP32-ID aus der Datenbank zu laden (oder ggf. anzulegen).
   *    - Falls kein Sensor gefunden/angelegt werden kann, wird ein Fehler geloggt und abgebrochen.
   * 4. Das Passage-Event wird in der Datenbank gespeichert:
   *    - Die Sensor-ID, der Zeitstempel (entweder aus den Daten oder aktuelle Zeit) und die Richtung werden gespeichert.
   * 5. Nach erfolgreicher Speicherung wird ein Logeintrag geschrieben.
   * 6. Optional: Falls ein EventsGateway und DoorService vorhanden sind,
   *    - wird die aktuelle Belegung (Kapazität) neu berechnet (mittels labStatusService.getLabCapacity())
   *    - und per WebSocket an verbundene Clients gesendet (sendOccupancyUpdate).
   * 7. Fehler beim Speichern oder beim Senden des Updates werden geloggt.
   * 
   * @param {string} esp32Id - Die ESP32-ID des Sensors.
   * @param {unknown} data - Das rohe Daten-Payload für das Passage-Event.
   * @returns {Promise<void>}
   */
  private async handlePassageEvent(esp32Id: string, data: unknown): Promise<void> {
    // Debug-Log: Zeigt an, dass ein Passage-Event verarbeitet wird, inkl. Rohdaten
    this.logger.debug(`Processing 'passage' event from ESP32 ID '${esp32Id}'. Raw data: ${JSON.stringify(data)}`);

    // 1. Validierung der empfangenen Daten gegen das PassageDataDto
    const validatedData = await this.validateAndLogErrors(data, MqttPassageDataDto, esp32Id, 'passage');
    if (!validatedData) return; // Bei Validierungsfehler: Abbruch

    // 2. Sensor anhand der ESP32-ID aus der Datenbank holen (oder ggf. anlegen)
    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
        // Wenn kein Sensor gefunden oder angelegt werden konnte, Fehler loggen und abbrechen
        this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. 'passage' event cannot be stored.`);
        return;
    }

    try {
      // 3. Versuch, das PassageEvent in der Datenbank zu speichern
      this.logger.verbose(`Attempting to store PassageEvent for sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), direction: ${validatedData.direction}.`);
      const createdEvent = await this.prismaService.passageEvent.create({
        data: {
          sensorId: sensor.id,
          // Nutze den übermittelten Zeitstempel, falls vorhanden, sonst aktuellen Zeitpunkt
          eventTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
          direction: validatedData.direction,
        },
      });
      // 4. Log: Erfolgreiches Speichern des Events
      this.logger.log(`Successfully stored PassageEvent: ID ${createdEvent.id} for sensor '${sensor.esp32Id}' (direction: ${validatedData.direction}).`);

      // 5. Aktualisiere die Raumbelegung automatisch basierend auf der Passage-Richtung
      if (this.occupancyService) {
        this.logger.verbose(`Updating room occupancy after passage event ID ${createdEvent.id}.`);
        await this.occupancyService.updateRoomOccupancy(sensor.id, validatedData.direction);
      }
    } catch (error) {
      // Fehler beim Speichern des Events oder beim Senden des Updates
      this.logger.error(`Error storing PassageEvent or updating occupancy for sensor '${sensor.esp32Id}'. Data: ${JSON.stringify(validatedData)}. Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * @private
   * @async
   * @method handleMotionEvent
   * @description Handles incoming motion event data from an MQTT message.
   * @param {string} esp32Id - The ESP32 ID of the sensor.
   * @param {unknown} data - The raw data payload for the motion event.
   * @returns {Promise<void>}
   *
   * Technische Erklärung:
   * - Diese Methode wird aufgerufen, wenn eine MQTT-Nachricht mit dem Typ "motion" empfangen wurde.
   * - Die empfangenen Rohdaten werden zunächst im Debug-Log ausgegeben.
   * - Die Daten werden gegen das DTO (MqttMotionDataDto) validiert. Bei Fehlern wird abgebrochen.
   * - Anschließend wird versucht, den zugehörigen Sensor anhand der ESP32-ID aus der Datenbank zu laden
   *   (oder ggf. anzulegen). Falls kein Sensor gefunden/angelegt werden kann, wird ein Fehler geloggt und abgebrochen.
   * - Es wird geprüft, ob das Feld "motionDetected" im Payload gesetzt ist. Falls nicht, wird standardmäßig "true" angenommen.
   * - Es wird ein neues MotionEvent in der Datenbank gespeichert, mit Sensor-Referenz, Zeitstempel und Bewegungsstatus.
   *   Der Zeitstempel wird aus den Daten übernommen, falls vorhanden, sonst wird die aktuelle Zeit verwendet.
   * - Nach erfolgreichem Speichern wird ein Log geschrieben.
   * - Optional könnte das Event per WebSocket an das Frontend gesendet werden (auskommentiert).
   * - Fehler beim Speichern werden abgefangen und geloggt.
   */
  private async handleMotionEvent(esp32Id: string, data: unknown): Promise<void> {
    // Debug-Log: Zeigt an, dass ein Motion-Event verarbeitet wird, inkl. Rohdaten
    this.logger.debug(`Processing 'motion' event from ESP32 ID '${esp32Id}'. Raw data: ${JSON.stringify(data)}`);

    // 1. Validierung der empfangenen Daten gegen das MotionDataDto
    const validatedData = await this.validateAndLogErrors(data, MqttMotionDataDto, esp32Id, 'motion');
    if (!validatedData) return; // Bei Validierungsfehler: Abbruch

    // 2. Sensor anhand der ESP32-ID aus der Datenbank holen (oder ggf. anlegen)
    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
        // Wenn kein Sensor gefunden oder angelegt werden konnte, Fehler loggen und abbrechen
        this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. 'motion' event cannot be stored.`);
        return;
    }

    try {
      // 3. Bewegungsstatus bestimmen (Standard: true, falls nicht gesetzt)
      const motionDetectedState = validatedData.motionDetected === undefined ? true : validatedData.motionDetected;

      // 4. Versuch, das MotionEvent in der Datenbank zu speichern
      this.logger.verbose(`Attempting to store MotionEvent for sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), motionDetected: ${motionDetectedState}.`);
      const createdEvent = await this.prismaService.motionEvent.create({
        data: {
          sensorId: sensor.id,
          eventTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
          motionDetected: motionDetectedState,
        },
      });

      // 5. Log: Erfolgreiches Speichern des Events
      this.logger.log(`Successfully stored MotionEvent: ID ${createdEvent.id} for sensor '${sensor.esp32Id}' (detected: ${createdEvent.motionDetected}).`);

      // 6. Optional: Event per WebSocket an das Frontend senden (auskommentiert)
      // if (this.eventsGateway) {
      //   this.logger.verbose(`Sending motion event update via WebSocket for event ID ${createdEvent.id}.`);
      //   // this.eventsGateway.sendMotionEvent(createdEvent); 
      // }
    } catch (error) {
      // Fehler beim Speichern des Events werden geloggt
      this.logger.error(`Error storing MotionEvent for sensor '${sensor.esp32Id}'. Data: ${JSON.stringify(validatedData)}. Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * @private
   * @async
   * @method handleLightBarrierEvent
   * @description Handles incoming light barrier event data from an MQTT message.
   * The payload is expected to be a simple string "1" (interrupted) or "0" (free).
   * @param {string} esp32Id - The ESP32 ID of the sensor, extracted from the topic.
   * @param {string} statusPayload - The raw string payload ("1" or "0").
   * @returns {Promise<void>}
   */
  private async handleLightBarrierEvent(esp32Id: string, statusPayload: string): Promise<void> {
    // Logge, dass ein Lichtschranken-Event verarbeitet wird, inkl. ESP32-ID und Payload
    this.logger.debug(`Processing 'light barrier' event from ESP32 ID '${esp32Id}'. Payload: "${statusPayload}"`);

    // Prüfe, ob das Payload gültig ist (nur "1" oder "0" sind erlaubt)
    if (statusPayload !== '1' && statusPayload !== '0') {
      // Falls ungültig, schreibe Warnung ins Log und breche ab
      this.logger.warn(`Invalid status payload for light barrier '${esp32Id}': "${statusPayload}". Expected '1' or '0'. Event ignored.`);
      return;
    }

    // Wandle das Payload in einen boolean um: "1" bedeutet unterbrochen (true), "0" bedeutet frei (false)
    const isInterrupted = statusPayload === '1';

    // Versuche, den Sensor anhand der ESP32-ID aus der Datenbank zu holen (oder ggf. anzulegen)
    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
        // Falls kein Sensor gefunden/angelegt werden konnte, logge Fehler und breche ab
        this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. 'light barrier' event cannot be stored.`);
        return;
    }

    try {
      // Versuche, das LightBarrierEvent in der Datenbank zu speichern
      this.logger.verbose(`Attempting to store LightBarrierEvent for sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), isInterrupted: ${isInterrupted}.`);
      const createdEvent = await this.prismaService.lightBarrierEvent.create({
        data: {
          sensorId: sensor.id,         // Referenz auf den Sensor
          isInterrupted: isInterrupted // Status der Lichtschranke (unterbrochen oder nicht)
        },
      });
      // Logge, dass das Event erfolgreich gespeichert wurde
      this.logger.log(`Successfully stored LightBarrierEvent: ID ${createdEvent.id} (interrupted: ${isInterrupted}) for sensor ${sensor.esp32Id}.`);

      // Optional: Event per WebSocket an das Frontend senden (auskommentiert)
      // if (this.eventsGateway) { 
      //    this.logger.verbose(`Sending light barrier update via WebSocket for event ID ${createdEvent.id}.`);
      //    // this.eventsGateway.sendLightBarrierUpdate({ sensorId: sensor.esp32Id, isInterrupted, timestamp: createdEvent.eventTimestamp });
      // }
    } catch (error) {
      // Fehler beim Speichern werden geloggt
      this.logger.error(`Failed to process light barrier event for ESP32 ID '${esp32Id}'. Payload: "${statusPayload}". Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
