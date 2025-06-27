/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DoorEvent } from '@prisma/client'; // Assuming we send these types or parts thereof. PassageEvent is currently unused.
import { OccupancyStatusDto } from 'src/door/models';
import { PrismaService } from '../../prisma.service';


// WebSocket events emitted by the server
/**
 * @constant WS_EVENT_DOOR_STATUS_UPDATE
 * @description WebSocket event name for door status updates.
 */
export const WS_EVENT_DOOR_STATUS_UPDATE = 'doorStatusUpdate';
/**
 * @constant WS_EVENT_OCCUPANCY_UPDATE
 * @description WebSocket event name for occupancy updates.
 */
export const WS_EVENT_OCCUPANCY_UPDATE = 'occupancyUpdate';

/**
 * @class EventsGateway
 * @description Handles WebSocket connections and real-time event broadcasting for door status and occupancy.
 * Implements NestJS WebSocket lifecycle hooks: OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect.
 * The `@WebSocketGateway()` decorator marks this class as a WebSocket gateway,
 * enabling real-time, bidirectional communication between clients and the server.
 */
@WebSocketGateway({
  cors: {
    origin: '*', // For development, specify more precisely in production!
  },
  // path: '/socket.io', // Default path, can be customized
  // transports: ['websocket'], // Default is websocket and polling
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  /**
   * @private
   * @readonly
   * @type {Logger}
   * @description Logger instance for this gateway, used for logging messages.
   */
  private readonly logger = new Logger(EventsGateway.name);

  /**
   * @private
   * @type {Server}
   * @description The Socket.IO server instance.
   * The `@WebSocketServer()` decorator injects the native Socket.IO server instance.
   * This allows direct access to the server's API for emitting events, managing rooms, etc.
   */
  @WebSocketServer()
  private server: Server; // Type Server from socket.io

  constructor(private readonly prisma: PrismaService) {}

  /**
   * @method afterInit
   * @description Lifecycle hook called after the gateway has been initialized.
   * @param {Server} _server - The Socket.IO server instance.
   */
  afterInit(_server: Server): void {
    // The '_server' parameter here is the same instance as 'this.server'
    // It's provided by NestJS for convenience within this lifecycle hook.
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * @method handleConnection
   * @description Lifecycle hook called when a new client connects.
   * @param {Socket} client - The connected client socket.
   * @param {any[]} _args - Additional arguments passed during connection (rarely used).
   */
  handleConnection(client: Socket, ..._args: any[]): void {
    this.logger.log(
      `Client connected: ${client.id} from IP ${client.handshake.address}`,
    );
    // Optional: Send initial status upon connection
    // this.sendInitialStatus(client);
  }

  /**
   * @method handleDisconnect
   * @description Lifecycle hook called when a client disconnects.
   * @param {Socket} client - The disconnected client socket.
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * @method handleRequestInitialStatus
   * @description Handles messages from clients subscribed to the 'requestInitialStatus' event.
   * The `@SubscribeMessage()` decorator marks this method as a handler for a specific WebSocket message.
   * @param {Socket} client - The client socket that sent the message.
   * @param {any} payload - The data sent by the client with the message.
   */
  @SubscribeMessage('requestInitialStatus')
  handleRequestInitialStatus(client: Socket, payload: any): void {
    this.logger.log(
      `Client ${client.id} requested initial status with payload:`,
      payload,
    );
    // Here, one could send the current door and occupancy status
    // e.g., by calling the respective services and then client.emit(...)
    client.emit('message', 'Initial status will be implemented soon.');
  }

  /**
   * @method sendDoorStatusUpdate
   * @description Broadcasts a door status update to all connected clients.
   * Includes room occupancy data and door status information.
   * @param {DoorEvent} doorEvent - The door event data to send.
   * @param {number} [currentOccupancy] - Current room occupancy (optional, will be fetched if not provided).
   * @param {number} [maxOccupancy] - Maximum room capacity (optional, will be fetched if not provided).
   */
  public async sendDoorStatusUpdate(
    doorEvent: DoorEvent, 
    currentOccupancy?: number, 
    maxOccupancy?: number
  ): Promise<void> {
    this.logger.log('Sending door status update:', doorEvent);
    
    // If occupancy data not provided, fetch from database
    let finalCurrentOccupancy = currentOccupancy ?? 0;
    let finalMaxOccupancy = maxOccupancy ?? 0;
    
    if (currentOccupancy === undefined || maxOccupancy === undefined) {
      try {
        // Import PrismaService to fetch room data
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        // Find sensor and room to get current occupancy
        const sensor = await prisma.sensor.findUnique({
          where: { id: doorEvent.sensorId },
          include: { room: true }
        });
        
        if (sensor?.room) {
          finalCurrentOccupancy = sensor.room.capacity;
          finalMaxOccupancy = sensor.room.maxCapacity;
          this.logger.verbose(`Fetched room data: occupancy ${finalCurrentOccupancy}/${finalMaxOccupancy} for sensor ${sensor.esp32Id}`);
        }
        
        await prisma.$disconnect();
      } catch (error) {
        this.logger.error('Failed to fetch room occupancy data:', error);
      }
    }
    
    // Determine room status color based on door state and occupancy
    let statusColor = 'green'; // Default: open and not full
    if (!doorEvent.doorIsOpen) {
      statusColor = 'red'; // Closed
    } else if (finalCurrentOccupancy >= finalMaxOccupancy && finalMaxOccupancy > 0) {
      statusColor = 'orange'; // Open but full
    }

    this.server.emit(WS_EVENT_DOOR_STATUS_UPDATE, {
      isOpen: doorEvent.doorIsOpen,
      currentOccupancy: finalCurrentOccupancy,
      maxOccupancy: finalMaxOccupancy,
      color: statusColor,
      currentDate: doorEvent.eventTimestamp,
      lastUpdated: doorEvent.eventTimestamp,
      sensorId: doorEvent.sensorId,
      eventId: doorEvent.id,
    });
  }

  /**
   * @method sendOccupancyUpdate
   * @description Broadcasts an occupancy status update to all connected clients.
   * Dynamically fetches door status from database.
   * @param {OccupancyStatusDto} occupancyStatus - The occupancy status data to send.
   * @param {number} maxCapacity - Maximum room capacity.
   * @param {string} [roomId] - Optional room ID to fetch door status for specific room.
   */
  public async sendOccupancyUpdate(
    occupancyStatus: OccupancyStatusDto,
    maxCapacity: number,
    roomId?: string,
  ): Promise<void> {
    this.logger.log('Sending occupancy update:', occupancyStatus);
    
    // Fetch current door status from database
    let isOpen = true; // Default fallback
    try {
      // Get the most recent door event for the room
      let latestDoorEvent;
      
      if (roomId) {
        // If specific room ID provided, get door event for that room
        latestDoorEvent = await this.prisma.doorEvent.findFirst({
          where: {
            sensor: {
              roomId: roomId,
            },
          },
          orderBy: {
            eventTimestamp: 'desc',
          },
        });
      } else {
        // If no room ID, get the latest door event across all rooms
        latestDoorEvent = await this.prisma.doorEvent.findFirst({
          orderBy: {
            eventTimestamp: 'desc',
          },
        });
      }

      if (latestDoorEvent) {
        isOpen = latestDoorEvent.doorIsOpen;
        this.logger.debug(`Fetched door status: ${isOpen ? 'open' : 'closed'}`);
      } else {
        this.logger.warn('No door events found in database, using default (open)');
      }
    } catch (error) {
      this.logger.error('Failed to fetch door status from database:', error);
      // Keep default value (true)
    }

    // Calculate color based on occupancy and door status
    const color = this.getOccupancyColorWithDoorStatus(
      occupancyStatus.currentOccupancy,
      maxCapacity,
      isOpen,
    );

    this.server.emit(
      WS_EVENT_OCCUPANCY_UPDATE,
      {
        currentOccupancy: occupancyStatus.currentOccupancy,
        maxOccupancy: maxCapacity,
        isOpen,
        color,
        currentDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    );
  }

  private getOccupancyColor(currentOccupancy: number, maxOccupancy: number): string {
    if (currentOccupancy >= maxOccupancy && maxOccupancy > 0) {
      return 'orange'; // Voll
    } else if (currentOccupancy > 0) {
      return 'green'; // Besetzt aber nicht voll
    } else {
      return 'gray'; // Leer
    }
  }

  /**
   * @method getOccupancyColorWithDoorStatus
   * @description Berechnet Farbkodierung basierend auf Belegung und Türstatus
   * @param {number} currentOccupancy - Aktuelle Belegung
   * @param {number} maxOccupancy - Maximale Kapazität
   * @param {boolean} isOpen - Türstatus (offen/geschlossen)
   * @returns {string} Farbkodierung (red, orange, green, gray)
   */
  private getOccupancyColorWithDoorStatus(
    currentOccupancy: number,
    maxOccupancy: number,
    isOpen: boolean,
  ): string {
    // Priorität: Türstatus überschreibt Belegungsfarbe
    if (!isOpen) {
      return 'red'; // Tür geschlossen = rot, unabhängig von Belegung
    }
    
    // Wenn Tür offen, normale Belegungslogik
    if (currentOccupancy >= maxOccupancy && maxOccupancy > 0) {
      return 'orange'; // Voll
    } else if (currentOccupancy > 0) {
      return 'green'; // Besetzt aber nicht voll
    } else {
      return 'gray'; // Leer
    }
  }

  // If we also want to push MotionEvents:
  // import { MotionEvent } from '@prisma/client';
  // export const WS_EVENT_MOTION_DETECTED = 'motionDetected';
  //
  // public sendMotionEvent(motionEvent: MotionEvent): void {
  //   this.logger.log('Sending motion event update:', motionEvent);
  //   this.server.emit(WS_EVENT_MOTION_DETECTED, motionEvent);
  // }
}
