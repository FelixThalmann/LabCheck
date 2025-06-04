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
import { OccupancyStatusModel } from 'src/door/models';

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

  /**
   * @method afterInit
   * @description Lifecycle hook called after the gateway has been initialized.
   * @param {Server} server - The Socket.IO server instance.
   */
  afterInit(server: Server): void {
    // The 'server' parameter here is the same instance as 'this.server'
    // It's provided by NestJS for convenience within this lifecycle hook.
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * @method handleConnection
   * @description Lifecycle hook called when a new client connects.
   * @param {Socket} client - The connected client socket.
   * @param {any[]} args - Additional arguments passed during connection (rarely used).
   */
  handleConnection(client: Socket, ...args: any[]): void {
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
   * @param {DoorEvent} doorEvent - The door event data to send.
   */
  public sendDoorStatusUpdate(doorEvent: DoorEvent): void {
    this.logger.log('Sending door status update:', doorEvent);
    this.server.emit(WS_EVENT_DOOR_STATUS_UPDATE, {
      isOpen: doorEvent.doorIsOpen,
      timestamp: doorEvent.eventTimestamp, // or createdAt for backend time
      sensorId: doorEvent.sensorId,
    });
  }

  /**
   * @method sendOccupancyUpdate
   * @description Broadcasts an occupancy status update to all connected clients.
   * @param {OccupancyStatusModel} occupancyStatus - The occupancy status data to send.
   */
  public sendOccupancyUpdate(occupancyStatus: OccupancyStatusModel): void {
    this.logger.log('Sending occupancy update:', occupancyStatus);
    this.server.emit(WS_EVENT_OCCUPANCY_UPDATE, occupancyStatus);
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
