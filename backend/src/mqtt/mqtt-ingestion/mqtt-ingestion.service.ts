/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import { MqttDoorDataDto, MqttPassageDataDto, MqttMotionDataDto } from '../dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { EventsGateway } from '../../events/events/events.gateway';
import { DoorService } from '../../door/door/door.service';

@Injectable()
export class MqttIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttIngestionService.name);
  private client: MqttClient;
  // Placeholder for WebSocketGateway - will be injected later
  // private eventsGateway: EventsGateway;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly eventsGateway: EventsGateway, // Injiziert
    private readonly doorService: DoorService, // Injiziert für Belegungsberechnung
    // private readonly eventsGateway: EventsGateway, // Wird später injiziert
  ) {}

  onModuleInit() {
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL');
    if (!brokerUrl) {
      this.logger.error('MQTT_BROKER_URL is not defined in environment variables.');
      return;
    }

    this.client = mqtt.connect(brokerUrl);

    this.client.on('connect', () => {
      this.logger.log(`Successfully connected to MQTT broker at ${brokerUrl}`);
      // Topic-Struktur gemäß PRD: uni/lab/door/{sensorId}/events
      // Wir verwenden einen Wildcard für die sensorId, um alle Sensoren abzudecken.
      // Die sensorId wird dann aus dem Topic extrahiert.
      const topic = 'uni/lab/door/+/events';
      this.client.subscribe(topic, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to topic ${topic}`, err);
        } else {
          this.logger.log(`Subscribed to MQTT topic: ${topic}`);
        }
      });
    });

    this.client.on('message', async (topic, payload) => {
      this.logger.debug(`Received message from topic ${topic}: ${payload.toString()}`);
      try {
        const rawMessage = JSON.parse(payload.toString());
        const topicParts = topic.split('/');
        const sensorEsp32Id = topicParts[3];

        if (!sensorEsp32Id) {
          this.logger.warn(`Could not extract sensor ESP32 ID from topic: ${topic}`);
          return;
        }

        if (!rawMessage.type || !rawMessage.data) {
            this.logger.warn(`Message from ${topic} is missing 'type' or 'data' field.`);
            return;
        }

        switch (rawMessage.type) {
          case 'door':
            await this.handleDoorEvent(sensorEsp32Id, rawMessage.data);
            break;
          case 'passage':
            await this.handlePassageEvent(sensorEsp32Id, rawMessage.data);
            break;
          case 'motion':
            await this.handleMotionEvent(sensorEsp32Id, rawMessage.data);
            break;
          default:
            this.logger.warn(`Unknown message type '${rawMessage.type}' received from ${topic}.`);
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          this.logger.error(`Failed to parse JSON message from ${topic}: ${payload.toString()}`, error.stack);
        } else {
          this.logger.error(`Failed to process MQTT message from ${topic}`, error.stack);
        }
      }
    });

    this.client.on('error', (error) => {
      this.logger.error('MQTT client error:', error.message, error.stack);
    });

    this.client.on('close', () => {
      this.logger.log('MQTT client disconnected');
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.logger.log('MQTT client connection closed.');
    }
  }

  private async getSensor(esp32Id: string) {
    let sensor = await this.prismaService.sensor.findUnique({
      where: { esp32Id },
    });

    if (!sensor) {
      this.logger.log(`Sensor with esp32Id ${esp32Id} not found, creating new one.`);
      // Hier könnte man überlegen, ob die Location initial gesetzt werden soll
      // oder ob es einen separaten Prozess/API dafür gibt.
      sensor = await this.prismaService.sensor.create({
        data: { esp32Id, location: 'Unknown - Auto-created' },
      });
    }
    return sensor;
  }

  private async validateAndLogErrors(data: unknown, DtoClass: any, sensorEsp32Id: string, eventType: string) {
    const dtoInstance = plainToClass(DtoClass, data as object);
    const errors = await validate(dtoInstance as object);
    if (errors.length > 0) {
      this.logger.error(`Validation failed for ${eventType} event from ESP32 ID ${sensorEsp32Id}: ${JSON.stringify(errors)}`, JSON.stringify(data));
      return null; // Indicate validation failure
    }
    return dtoInstance;
  }

  private async handleDoorEvent(esp32Id: string, data: any) {
    this.logger.debug(`Handling door event for ESP32 ID ${esp32Id}: ${JSON.stringify(data)}`);
    const validatedData = await this.validateAndLogErrors(data, MqttDoorDataDto, esp32Id, 'door');
    if (!validatedData) return;

    const sensor = await this.getSensor(esp32Id);
    const createdEvent = await this.prismaService.doorEvent.create({
      data: {
        sensorId: sensor.id,
        eventTimestamp: (validatedData as any).timestamp ? new Date((validatedData as any).timestamp) : new Date(),
        doorIsOpen: (validatedData as any).isOpen,
      },
    });
    this.logger.log(`Stored DoorEvent: ${createdEvent.id} for sensor ${sensor.esp32Id}`);
    this.eventsGateway.sendDoorStatusUpdate(createdEvent);
    // Nach einem Tür-Event könnte sich auch die Belegung ändern (z.B. wenn Zählung ungenau ist und man resettet)
    // Fürs Erste belassen wir es bei der direkten Benachrichtigung über das Tür-Event.
  }

  private async handlePassageEvent(esp32Id: string, data: any) {
    this.logger.debug(`Handling passage event for ESP32 ID ${esp32Id}: ${JSON.stringify(data)}`);
    const validatedData = await this.validateAndLogErrors(data, MqttPassageDataDto, esp32Id, 'passage');
    if (!validatedData) return;

    const sensor = await this.getSensor(esp32Id);
    
    // PRD FR-B-2.2: Ableitung der Richtung aus ToF-Sequenzen
    // Für MVP wird angenommen, dass ESP32 die Richtung bereits sendet (`validatedData.direction`)
    // Eine komplexere Logik basierend auf rohen ToF-Timestamps würde hier implementiert.

    const createdEvent = await this.prismaService.passageEvent.create({
      data: {
        sensorId: sensor.id,
        eventTimestamp: (validatedData as any).timestamp ? new Date((validatedData as any).timestamp) : new Date(),
        direction: (validatedData as any).direction,
      },
    });
    this.logger.log(`Stored PassageEvent: ${createdEvent.id} for sensor ${sensor.esp32Id}`);
    // Nach einem PassageEvent die aktuelle Belegung neu berechnen und senden
    const occupancyStatus = await this.doorService.getCurrentOccupancy(sensor.id);
    this.eventsGateway.sendOccupancyUpdate(occupancyStatus);
  }

  private async handleMotionEvent(esp32Id: string, data: any) {
    this.logger.debug(`Handling motion event for ESP32 ID ${esp32Id}: ${JSON.stringify(data)}`);
    const validatedData = await this.validateAndLogErrors(data, MqttMotionDataDto, esp32Id, 'motion');
    if (!validatedData) return;

    const sensor = await this.getSensor(esp32Id);
    const createdEvent = await this.prismaService.motionEvent.create({
      data: {
        sensorId: sensor.id,
        eventTimestamp: (validatedData as any).timestamp ? new Date((validatedData as any).timestamp) : new Date(),
        motionDetected: (validatedData as any).motionDetected === undefined ? true : (validatedData as any).motionDetected,
      },
    });
    this.logger.log(`Stored MotionEvent: ${createdEvent.id} for sensor ${sensor.esp32Id}`);
    // Optional: this.eventsGateway.sendMotionEvent(createdEvent); // Falls Frontend das braucht
  }
}
