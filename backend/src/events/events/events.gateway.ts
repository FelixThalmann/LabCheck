/* eslint-disable prettier/prettier */
import { Logger, Inject, forwardRef } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Event } from '@prisma/client';
import { OccupancyStatusDto } from 'src/door/models';
import { LabStatusService } from '../../lab-status/services/lab-status.service';


// WebSocket events emitted by the server
/**
 * WebSocket event name for door status updates
 */
export const WS_EVENT_DOOR_STATUS_UPDATE = 'doorStatusUpdate';
/**
 * WebSocket event name for occupancy updates
 */
export const WS_EVENT_OCCUPANCY_UPDATE = 'occupancyUpdate';
/**
 * WebSocket event name for capacity updates
 */
export const WS_EVENT_CAPACITY_UPDATE = 'capacityUpdate';

/**
 * Handles WebSocket connections and real-time event broadcasting for door status and occupancy.
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
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  private server: Server;

  constructor(@Inject(forwardRef(() => LabStatusService)) private readonly labStatusService: LabStatusService) {}

  /**
   * Lifecycle hook called after the gateway has been initialized
   * @param _server - The Socket.IO server instance
   */
  afterInit(_server: Server): void {
    // The '_server' parameter here is the same instance as 'this.server'
    // It's provided by NestJS for convenience within this lifecycle hook
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * Lifecycle hook called when a new client connects
   * @param client - The connected client socket
   * @param _args - Additional arguments passed during connection (rarely used)
   */
  handleConnection(client: Socket, ..._args: any[]): void {
    this.logger.log(
      `Client connected: ${client.id} from IP ${client.handshake.address}`,
    );
    // Optional: Send initial status upon connection
    // this.sendInitialStatus(client);
  }

  /**
   * Lifecycle hook called when a client disconnects
   * @param client - The disconnected client socket
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Handles messages from clients subscribed to the 'requestInitialStatus' event
   * The `@SubscribeMessage()` decorator marks this method as a handler for a specific WebSocket message
   * @param client - The client socket that sent the message
   * @param payload - The data sent by the client with the message
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
   * Broadcasts a door status update to all connected clients using LabStatusService
   * Uses centralized business logic for consistent data across REST API and WebSocket updates
   * @param event - The door event data to send
   */
    public async sendDoorStatusUpdate(event: Event): Promise<void> {
    this.logger.log('Sending door status update:', event);
    
    try {
      // Get current lab status from centralized service (Single Source of Truth)
      const labStatus = await this.labStatusService.getCombinedLabStatus();
      
      // Override door status with the actual event status
      const isOpen = event.isDoorOpen;
      
      // Determine color based on door status and occupancy using consistent logic
      let color = labStatus.color;
      if (!isOpen) {
        color = 'red'; // Door closed always shows red
      }
      
      this.logger.verbose(`Broadcasting door status: isOpen=${isOpen}, occupancy=${labStatus.currentOccupancy}/${labStatus.maxOccupancy}, color=${color}`);

      this.server.emit(WS_EVENT_DOOR_STATUS_UPDATE, {
        isOpen,
        currentOccupancy: labStatus.currentOccupancy,
        maxOccupancy: labStatus.maxOccupancy,
        color,
        currentDate: event.timestamp,
        lastUpdated: event.timestamp,
        sensorId: event.sensorId,
        eventId: event.id,
      });
    } catch (error) {
      this.logger.error(`Failed to send door status update for event ${event.id}:`, error);
    }
  }

  /**
   * Broadcasts an occupancy status update to all connected clients using LabStatusService
   * Uses centralized business logic for consistent data across REST API and WebSocket updates
   * @param occupancyStatus - The occupancy status data to send
   */
  public async sendOccupancyUpdate(occupancyStatus: OccupancyStatusDto): Promise<void> {
    this.logger.log('Sending occupancy update:', occupancyStatus);
    
    try {
      // Get current lab status from centralized service (Single Source of Truth)
      const labStatus = await this.labStatusService.getCombinedLabStatus();
      
      // Safe access to occupancyStatus properties (handle undefined/null gracefully)
      const inputOccupancy = occupancyStatus?.currentOccupancy ?? 0;
      
      this.logger.verbose(`Broadcasting occupancy update: occupancy=${inputOccupancy}, maxOccupancy=${labStatus.maxOccupancy}, isOpen=${labStatus.isOpen}, color=${labStatus.color}`);

      this.server.emit(WS_EVENT_OCCUPANCY_UPDATE, {
        currentOccupancy: labStatus.currentOccupancy,
        maxOccupancy: labStatus.maxOccupancy,
        isOpen: labStatus.isOpen,
        color: labStatus.color,
        currentDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to send occupancy update:', error);
    }
  }

  /**
   * Broadcasts a capacity update to all connected clients using LabStatusService
   * Uses centralized business logic for consistent data across REST API and WebSocket updates
   * @param newMaxCapacity - The new maximum capacity
   * @param currentOccupancy - The current occupancy
   * @param isOpen - Door status
   */
  public async sendCapacityUpdate(
    newMaxCapacity: number,
    currentOccupancy: number,
    isOpen: boolean,
  ): Promise<void> {
    this.logger.log(`Sending capacity update: maxCapacity=${newMaxCapacity}, currentOccupancy=${currentOccupancy}`);
    
    try {
      // Get current lab status from centralized service for consistent color logic
      const labStatus = await this.labStatusService.getCombinedLabStatus();
      
      // Determine color based on door status - door closed always shows red
      let color = labStatus.color;
      if (!isOpen) {
        color = 'red';
      }
      
      this.logger.verbose(`Broadcasting capacity update: newMaxCapacity=${newMaxCapacity}, currentOccupancy=${currentOccupancy}, isOpen=${isOpen}, color=${color}`);

      this.server.emit(WS_EVENT_CAPACITY_UPDATE, {
        newMaxCapacity,
        currentOccupancy,
        isOpen,
        color,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to send capacity update:', error);
    }
  }

}
