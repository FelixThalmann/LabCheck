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
import { DoorService } from '../../door/door/door.service';
import { Sensor, LightBarrierEvent } from '@prisma/client';

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
    private readonly doorService: DoorService, // Injected for occupancy calculation
  ) {}

  /**
   * @method onModuleInit
   * @description NestJS lifecycle hook. Called once the host module has been initialized.
   * Initializes the MQTT client, connects to the broker, and subscribes to relevant topics.
   * Sets up event handlers for 'connect', 'message', 'error', and 'close'.
   * @returns {void}
   */
  onModuleInit(): void {
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL');
    const mqttOptions: IClientOptions = {};
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');

    if (username) mqttOptions.username = username;
    if (password) mqttOptions.password = password;


    if (!brokerUrl) {
      this.logger.error('MQTT_BROKER_URL is not defined in environment variables.');
      return;
    }

    this.client = mqtt.connect(brokerUrl, mqttOptions);

    this.client.on('connect', () => {
      this.logger.log(`Successfully connected to MQTT broker at ${brokerUrl}`);
      
      const topicsToSubscribe = [
        { name: 'uni/lab/door/+/events', handler: 'jsonBasedHandler' }, // Bestehendes Topic-Muster
        { name: 'sensor/lichtschranke/+/status', handler: 'lightBarrierHandler'} // Neues Topic-Muster für Lichtschranken
      ];

      topicsToSubscribe.forEach(topicInfo => {
        this.client.subscribe(topicInfo.name, (err) => {
          if (err) {
            this.logger.error(`Failed to subscribe to topic ${topicInfo.name}`, err);
          } else {
            this.logger.log(`Subscribed to MQTT topic: ${topicInfo.name}`);
          }
        });
      });
    });

    this.client.on('message', async (topic: string, payload: Buffer) => {
      this.logger.debug(`Received message from topic ${topic}: ${payload.toString()}`);
      const messageContent = payload.toString();

      // Unterscheidung basierend auf dem Topic-Muster
      if (topic.startsWith('sensor/lichtschranke/')) {
        const topicParts = topic.split('/');
        // Erwartetes Format: sensor/lichtschranke/{sensorEsp32Id}/status
        if (topicParts.length === 4 && topicParts[0] === 'sensor' && topicParts[1] === 'lichtschranke' && topicParts[3] === 'status') {
          const sensorEsp32Id = topicParts[2];
          await this.handleLightBarrierEvent(sensorEsp32Id, messageContent);
        } else {
          this.logger.warn(`Malformed topic for light barrier: ${topic}. Expected 'sensor/lichtschranke/{sensorId}/status'.`);
        }
      } else if (topic.startsWith('uni/lab/door/')) { // Bestehende Logik für JSON-basierte Nachrichten
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const rawMessage = JSON.parse(messageContent);
          const topicParts = topic.split('/');
          const sensorEsp32Id = topicParts[3]; // Annahme: uni/lab/door/{sensorId}/events Struktur

          if (!sensorEsp32Id) {
            this.logger.warn(`Could not extract sensor ESP32 ID from topic: ${topic}`);
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (!rawMessage.type || !rawMessage.data) {
              this.logger.warn(`Message from ${topic} is missing 'type' or 'data' field.`);
              return;
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          switch (rawMessage.type) {
            case 'door':
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              await this.handleDoorEvent(sensorEsp32Id, rawMessage.data);
              break;
            case 'passage':
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              await this.handlePassageEvent(sensorEsp32Id, rawMessage.data);
              break;
            case 'motion':
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              await this.handleMotionEvent(sensorEsp32Id, rawMessage.data);
              break;
            default:
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              this.logger.warn(`Unknown message type '${rawMessage.type as string}' received from ${topic}.`);
          }
        } catch (error) {
          if (error instanceof SyntaxError) {
            this.logger.error(`Failed to parse JSON message from ${topic}: ${messageContent}`, error.stack);
          } else {
            this.logger.error(`Failed to process MQTT message from ${topic}`, error instanceof Error ? error.stack : String(error));
          }
        }
      } else {
        this.logger.warn(`Message received on unhandled topic: ${topic}`);
      }
    });

    this.client.on('error', (error: Error) => {
      this.logger.error('MQTT client error:', error.message, error.stack);
    });

    this.client.on('close', () => {
      this.logger.log('MQTT client disconnected');
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
      this.client.end();
      this.logger.log('MQTT client connection closed.');
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
   */
  private async getSensor(esp32Id: string): Promise<Sensor> {
    let sensor = await this.prismaService.sensor.findUnique({
      where: { esp32Id },
    });

    if (!sensor) {
      this.logger.log(`Sensor with esp32Id ${esp32Id} not found, creating new one.`);
      // One could consider whether the location should be set initially
      // or if there is a separate process/API for it.
      sensor = await this.prismaService.sensor.create({
        data: { esp32Id, location: 'Unknown - Auto-created' },
      });
    }
    return sensor;
  }

  /**
   * @private
   * @async
   * @method validateAndLogErrors
   * @description Validates the incoming data against a specified DTO class.
   * Logs any validation errors and returns null if validation fails.
   * @template T
   * @param {unknown} data - The raw data to validate.
   * @param {ClassConstructor<T>} DtoClass - The DTO class to validate against. (Note: Using 'any' due to dynamic DTOs, ideally use a more specific type or generics if possible for DtoClass)
   * @param {string} sensorEsp32Id - The ESP32 ID of the sensor from which the data originated.
   * @param {string} eventType - The type of event being validated (e.g., 'door', 'passage').
   * @returns {Promise<T | null>} A promise that resolves to the validated DTO instance or null if validation fails.
   */
  private async validateAndLogErrors<T extends object>(data: unknown, DtoClass: new () => T, sensorEsp32Id: string, eventType: string): Promise<T | null> {
    const dtoInstance = plainToClass(DtoClass, data); // Removed 'as object' cast, plainToClass handles it
    const errors: ValidationError[] = await validate(dtoInstance); // Removed 'as object' cast
    if (errors.length > 0) {
      this.logger.error(`Validation failed for ${eventType} event from ESP32 ID ${sensorEsp32Id}: ${JSON.stringify(errors)}`, JSON.stringify(data));
      return null; // Indicate validation failure
    }
    return dtoInstance;
  }

  /**
   * @private
   * @async
   * @method handleDoorEvent
   * @description Handles incoming door event data from an MQTT message.
   * Validates the data, retrieves/creates the sensor, stores the event in the database,
   * and sends a door status update via WebSocket.
   * @param {string} esp32Id - The ESP32 ID of the sensor.
   * @param {unknown} data - The raw data payload for the door event.
   * @returns {Promise<void>}
   */
  private async handleDoorEvent(esp32Id: string, data: unknown): Promise<void> {
    this.logger.debug(`Handling door event for ESP32 ID ${esp32Id}: ${JSON.stringify(data)}`);
    const validatedData = await this.validateAndLogErrors(data, MqttDoorDataDto, esp32Id, 'door');
    if (!validatedData) return;

    const sensor = await this.getSensor(esp32Id);
    const createdEvent = await this.prismaService.doorEvent.create({
      data: {
        sensorId: sensor.id,
        eventTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
        doorIsOpen: validatedData.isOpen,
      },
    });
    this.logger.log(`Stored DoorEvent: ${createdEvent.id} for sensor ${sensor.esp32Id}`);
    this.eventsGateway.sendDoorStatusUpdate(createdEvent);
    // After a door event, occupancy might also change (e.g., if counting is inaccurate and reset)
    // For now, we'll stick to direct notification about the door event.
  }

  /**
   * @private
   * @async
   * @method handlePassageEvent
   * @description Handles incoming passage event data from an MQTT message.
   * Validates the data, retrieves/creates the sensor, stores the event,
   * recalculates the current lab occupancy, and sends an occupancy update via WebSocket.
   * @param {string} esp32Id - The ESP32 ID of the sensor.
   * @param {unknown} data - The raw data payload for the passage event.
   * @returns {Promise<void>}
   */
  private async handlePassageEvent(esp32Id: string, data: unknown): Promise<void> {
    this.logger.debug(`Handling passage event for ESP32 ID ${esp32Id}: ${JSON.stringify(data)}`);
    const validatedData = await this.validateAndLogErrors(data, MqttPassageDataDto, esp32Id, 'passage');
    if (!validatedData) return;

    const sensor = await this.getSensor(esp32Id);
    
    // PRD FR-B-2.2: Derivation of direction from ToF sequences
    // For MVP, it is assumed that ESP32 already sends the direction (`validatedData.direction`)
    // More complex logic based on raw ToF timestamps would be implemented here.

    const createdEvent = await this.prismaService.passageEvent.create({
      data: {
        sensorId: sensor.id,
        eventTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
        direction: validatedData.direction,
      },
    });
    this.logger.log(`Stored PassageEvent: ${createdEvent.id} for sensor ${sensor.esp32Id}`);
    // After a passage event, recalculate and send the current occupancy
    const occupancyStatus = await this.doorService.getCurrentOccupancy(sensor.id);
    this.eventsGateway.sendOccupancyUpdate(occupancyStatus);
  }

  /**
   * @private
   * @async
   * @method handleMotionEvent
   * @description Handles incoming motion event data from an MQTT message.
   * Validates the data, retrieves/creates the sensor, and stores the motion event in the database.
   * Optionally, it can send a motion event update via WebSocket if needed by the frontend.
   * @param {string} esp32Id - The ESP32 ID of the sensor.
   * @param {unknown} data - The raw data payload for the motion event.
   * @returns {Promise<void>}
   */
  private async handleMotionEvent(esp32Id: string, data: unknown): Promise<void> {
    this.logger.debug(`Handling motion event for ESP32 ID ${esp32Id}: ${JSON.stringify(data)}`);
    const validatedData = await this.validateAndLogErrors(data, MqttMotionDataDto, esp32Id, 'motion');
    if (!validatedData) return;

    const sensor = await this.getSensor(esp32Id);
    const createdEvent = await this.prismaService.motionEvent.create({
      data: {
        sensorId: sensor.id,
        eventTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
        motionDetected: validatedData.motionDetected === undefined ? true : validatedData.motionDetected,
      },
    });
    this.logger.log(`Stored MotionEvent: ${createdEvent.id} for sensor ${sensor.esp32Id}`);
    // Optional: this.eventsGateway.sendMotionEvent(createdEvent); // If frontend needs it
  }

  /**
   * @private
   * @async
   * @method handleLightBarrierEvent
   * @description Handles incoming light barrier event data from an MQTT message.
   * The payload is expected to be a simple string "1" (interrupted) or "0" (free).
   * Retrieves/creates the sensor and stores the event in the database.
   * @param {string} esp32Id - The ESP32 ID of the sensor, extracted from the topic.
   * @param {string} statusPayload - The raw string payload ("1" or "0").
   * @returns {Promise<void>}
   */
  private async handleLightBarrierEvent(esp32Id: string, statusPayload: string): Promise<void> {
    this.logger.debug(`Handling light barrier event for ESP32 ID ${esp32Id} with payload: "${statusPayload}"`);

    if (statusPayload !== '1' && statusPayload !== '0') {
      this.logger.warn(`Invalid status payload for light barrier ${esp32Id}: "${statusPayload}". Expected '1' or '0'.`);
      return;
    }
    const isInterrupted = statusPayload === '1';

    try {
      const sensor = await this.getSensor(esp32Id);
      const createdEvent = await this.prismaService.lightBarrierEvent.create({
        data: {
          sensorId: sensor.id,
          isInterrupted: isInterrupted,
          // eventTimestamp wird durch @default(now()) im Schema gesetzt
        },
      });
      this.logger.log(`Stored LightBarrierEvent: ${createdEvent.id} (interrupted: ${isInterrupted}) for sensor ${sensor.esp32Id}`);

      // Optional: Event via WebSocket an Frontend senden, falls benötigt
      // this.eventsGateway.sendLightBarrierUpdate({ sensorId: sensor.esp32Id, isInterrupted, timestamp: createdEvent.eventTimestamp });
      // Dafür müsste im EventsGateway eine entsprechende Methode sendLightBarrierUpdate implementiert
      // und im Frontend ein entsprechender Listener vorhanden sein.
    } catch (error) {
      this.logger.error(`Failed to process light barrier event for ESP32 ID ${esp32Id}. Payload: "${statusPayload}"`, error instanceof Error ? error.stack : String(error));
    }
  }
}
