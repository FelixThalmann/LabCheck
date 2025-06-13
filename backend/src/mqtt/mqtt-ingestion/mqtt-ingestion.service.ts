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
import { DoorService } from '../../door/door/door.service';
import { Sensor } from '@prisma/client';

const JSON_BASED_EVENTS_TOPIC_PREFIX = 'labcheck/entrance';
const LIGHT_BARRIER_TOPIC_PREFIX = 'labcheck/door';

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

    if (username) mqttOptions.username = username;
    if (password) mqttOptions.password = password;

    if (!brokerUrl) {
      this.logger.error('MQTT_BROKER_URL is not defined. MQTT ingestion service will not start.');
      return;
    }

    this.logger.log(`Attempting to connect to MQTT broker at ${brokerUrl} with client ID ${mqttOptions.clientId}`);
    this.client = mqtt.connect(brokerUrl, mqttOptions);

    this.client.on('connect', () => {
      this.logger.log(`Successfully connected to MQTT broker at ${brokerUrl}`);
      const topicsToSubscribe = [
        { name: `${JSON_BASED_EVENTS_TOPIC_PREFIX}`, description: 'JSON-based sensor events' }, 
        { name: `${LIGHT_BARRIER_TOPIC_PREFIX}`, description: 'Light barrier status events' }
      ];

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

    this.client.on('message', async (topic: string, payload: Buffer) => {
      const messageContent = payload.toString();
      this.logger.debug(`Received raw message on topic '${topic}': "${messageContent}"`);

      if (topic.startsWith(LIGHT_BARRIER_TOPIC_PREFIX)) {
        const esp32IdFromTopic = topic.substring(LIGHT_BARRIER_TOPIC_PREFIX.length);
        if (esp32IdFromTopic && !esp32IdFromTopic.includes('/')) { // Einfache Prüfung, ob ID vorhanden und kein weiteres /-Segment
          this.logger.verbose(`Extracted ESP32 ID '${esp32IdFromTopic}' from light barrier topic '${topic}'.`);
          await this.handleLightBarrierEvent(esp32IdFromTopic, messageContent);
        } else {
          this.logger.warn(`Malformed topic for light barrier: '${topic}'. Expected format '${LIGHT_BARRIER_TOPIC_PREFIX}{sensorId}'. Extracted ID part: '${esp32IdFromTopic}'. Message ignored.`);
        }
      } else if (topic.startsWith(JSON_BASED_EVENTS_TOPIC_PREFIX)) { 
        const topicParts = topic.split('/');
        // uni/lab/door/{sensorId}/events -> sensorId is at index 3
        const esp32IdFromTopic = topicParts[3]; 

        if (!esp32IdFromTopic) {
          this.logger.warn(`Could not extract ESP32 ID from JSON-based event topic: '${topic}'. Message ignored.`);
          return;
        }
        this.logger.verbose(`Extracted ESP32 ID '${esp32IdFromTopic}' from JSON-based topic '${topic}'.`);

        try {
          const rawMessage = JSON.parse(messageContent);
          this.logger.verbose(`Successfully parsed JSON message from ESP32 ID '${esp32IdFromTopic}'. Type: '${rawMessage?.type}'.`);

          if (!rawMessage || typeof rawMessage.type !== 'string' || typeof rawMessage.data === 'undefined') {
              this.logger.warn(`Message from ESP32 ID '${esp32IdFromTopic}' (topic: '${topic}') is missing 'type' or 'data' field, or they have incorrect type. Payload: "${messageContent}". Message ignored.`);
              return;
          }

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
          if (error instanceof SyntaxError) {
            this.logger.error(`Failed to parse JSON message from ESP32 ID '${esp32IdFromTopic}' (topic: '${topic}'): "${messageContent}". Error: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Failed to process JSON-based MQTT message from ESP32 ID '${esp32IdFromTopic}' (topic: '${topic}'). Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
          }
        }
      } else {
        this.logger.warn(`Message received on unhandled topic: '${topic}'. Message: "${messageContent}". Message ignored.`);
      }
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`MQTT client error: ${error.message}`, error.stack);
    });

    this.client.on('reconnect', () => {
      this.logger.log('MQTT client is attempting to reconnect...');
    });

    this.client.on('offline', () => {
      this.logger.warn('MQTT client went offline.');
    });

    this.client.on('close', () => {
      this.logger.log('MQTT client disconnected.'); // Reconnect logic is often handled by mqtt.js itself based on options
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
  private async validateAndLogErrors<T extends object>(data: unknown, DtoClass: new () => T, sensorEsp32Id: string, eventType: string): Promise<T | null> {
    this.logger.verbose(`Validating ${eventType} event data for ESP32 ID '${sensorEsp32Id}'.`);
    if (typeof data !== 'object' || data === null) {
        this.logger.warn(`Validation failed for ${eventType} event from ESP32 ID '${sensorEsp32Id}': data is not an object. Received: ${JSON.stringify(data)}. Event ignored.`);
        return null;
    }
    const dtoInstance = plainToClass(DtoClass, data);
    const errors: ValidationError[] = await validate(dtoInstance);
    if (errors.length > 0) {
      const errorMessages = errors.map(err => Object.values(err.constraints || {}).join(', ')).join('; ');
      this.logger.warn(`Validation failed for ${eventType} event from ESP32 ID '${sensorEsp32Id}': ${errorMessages}. Data: ${JSON.stringify(data)}. Event ignored.`);
      return null; 
    }
    this.logger.verbose(`Validation successful for ${eventType} event data from ESP32 ID '${sensorEsp32Id}'.`);
    return dtoInstance;
  }

  /**
   * @private
   * @async
   * @method handleDoorEvent
   * @description Handles incoming door event data from an MQTT message.
   * @param {string} esp32Id - The ESP32 ID of the sensor.
   * @param {unknown} data - The raw data payload for the door event.
   * @returns {Promise<void>}
   */
  private async handleDoorEvent(esp32Id: string, data: unknown): Promise<void> {
    this.logger.debug(`Processing 'door' event from ESP32 ID '${esp32Id}'. Raw data: ${JSON.stringify(data)}`);
    const validatedData = await this.validateAndLogErrors(data, MqttDoorDataDto, esp32Id, 'door');
    if (!validatedData) return; // Error already logged by validateAndLogErrors

    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
        this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. 'door' event cannot be stored.`);
        return;
    }

    try {
      this.logger.verbose(`Attempting to store DoorEvent for sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), isOpen: ${validatedData.isOpen}.`);
      const createdEvent = await this.prismaService.doorEvent.create({
        data: {
          sensorId: sensor.id,
          eventTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
          doorIsOpen: validatedData.isOpen,
        },
      });
      this.logger.log(`Successfully stored DoorEvent: ID ${createdEvent.id} for sensor '${sensor.esp32Id}' (isOpen: ${validatedData.isOpen}).`);
      if (this.eventsGateway) {
        this.logger.verbose(`Sending door status update via WebSocket for event ID ${createdEvent.id}.`);
        this.eventsGateway.sendDoorStatusUpdate(createdEvent);
      }
    } catch (error) {
       this.logger.error(`Error storing DoorEvent for sensor '${sensor.esp32Id}'. Data: ${JSON.stringify(validatedData)}. Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * @private
   * @async
   * @method handlePassageEvent
   * @description Handles incoming passage event data from an MQTT message.
   * @param {string} esp32Id - The ESP32 ID of the sensor.
   * @param {unknown} data - The raw data payload for the passage event.
   * @returns {Promise<void>}
   */
  private async handlePassageEvent(esp32Id: string, data: unknown): Promise<void> {
    this.logger.debug(`Processing 'passage' event from ESP32 ID '${esp32Id}'. Raw data: ${JSON.stringify(data)}`);
    const validatedData = await this.validateAndLogErrors(data, MqttPassageDataDto, esp32Id, 'passage');
    if (!validatedData) return;

    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
        this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. 'passage' event cannot be stored.`);
        return;
    }

    try {
      this.logger.verbose(`Attempting to store PassageEvent for sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), direction: ${validatedData.direction}.`);
      const createdEvent = await this.prismaService.passageEvent.create({
        data: {
          sensorId: sensor.id,
          eventTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
          direction: validatedData.direction,
        },
      });
      this.logger.log(`Successfully stored PassageEvent: ID ${createdEvent.id} for sensor '${sensor.esp32Id}' (direction: ${validatedData.direction}).`);
      if (this.eventsGateway && this.doorService) {
        this.logger.verbose(`Calculating and sending occupancy update via WebSocket after passage event ID ${createdEvent.id}.`);
        const occupancyStatus = await this.doorService.getCurrentOccupancy(sensor.id);
        this.eventsGateway.sendOccupancyUpdate(occupancyStatus);
      }
    } catch (error) {
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
   */
  private async handleMotionEvent(esp32Id: string, data: unknown): Promise<void> {
    this.logger.debug(`Processing 'motion' event from ESP32 ID '${esp32Id}'. Raw data: ${JSON.stringify(data)}`);
    const validatedData = await this.validateAndLogErrors(data, MqttMotionDataDto, esp32Id, 'motion');
    if (!validatedData) return;
    
    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
        this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. 'motion' event cannot be stored.`);
        return;
    }

    try {
      const motionDetectedState = validatedData.motionDetected === undefined ? true : validatedData.motionDetected;
      this.logger.verbose(`Attempting to store MotionEvent for sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), motionDetected: ${motionDetectedState}.`);
      const createdEvent = await this.prismaService.motionEvent.create({
        data: {
          sensorId: sensor.id,
          eventTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
          motionDetected: motionDetectedState,
        },
      });
      this.logger.log(`Successfully stored MotionEvent: ID ${createdEvent.id} for sensor '${sensor.esp32Id}' (detected: ${createdEvent.motionDetected}).`);
      // Optional: this.eventsGateway.sendMotionEvent(createdEvent); // If frontend needs it
      // if (this.eventsGateway) {
      //   this.logger.verbose(`Sending motion event update via WebSocket for event ID ${createdEvent.id}.`);
      //   // this.eventsGateway.sendMotionEvent(createdEvent); 
      // }
    } catch (error) {
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
    this.logger.debug(`Processing 'light barrier' event from ESP32 ID '${esp32Id}'. Payload: "${statusPayload}"`);

    if (statusPayload !== '1' && statusPayload !== '0') {
      this.logger.warn(`Invalid status payload for light barrier '${esp32Id}': "${statusPayload}". Expected '1' or '0'. Event ignored.`);
      return;
    }
    const isInterrupted = statusPayload === '1';

    const sensor = await this.getSensor(esp32Id);
    if (!sensor) {
        this.logger.error(`Could not find or create sensor for ESP32 ID '${esp32Id}'. 'light barrier' event cannot be stored.`);
        return;
    }

    try {
      this.logger.verbose(`Attempting to store LightBarrierEvent for sensor '${sensor.esp32Id}' (DB ID: ${sensor.id}), isInterrupted: ${isInterrupted}.`);
      const createdEvent = await this.prismaService.lightBarrierEvent.create({
        data: {
          sensorId: sensor.id,
          isInterrupted: isInterrupted,
        },
      });
      this.logger.log(`Successfully stored LightBarrierEvent: ID ${createdEvent.id} (interrupted: ${isInterrupted}) for sensor ${sensor.esp32Id}.`);

      // Optional: Event via WebSocket an Frontend senden, falls benötigt
      // if (this.eventsGateway) { 
      //    this.logger.verbose(`Sending light barrier update via WebSocket for event ID ${createdEvent.id}.`);
      //    // this.eventsGateway.sendLightBarrierUpdate({ sensorId: sensor.esp32Id, isInterrupted, timestamp: createdEvent.eventTimestamp });
      // }
    } catch (error) {
      this.logger.error(`Failed to process light barrier event for ESP32 ID '${esp32Id}'. Payload: "${statusPayload}". Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
