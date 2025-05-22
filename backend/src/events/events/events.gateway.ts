import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DoorEvent, PassageEvent } from '@prisma/client'; // Annahme: Wir senden diese Typen oder Teile davon
import { OccupancyStatusModel } from 'src/door/models';

// Events, die vom Server gesendet werden
export const WS_EVENT_DOOR_STATUS_UPDATE = 'doorStatusUpdate';
export const WS_EVENT_OCCUPANCY_UPDATE = 'occupancyUpdate';

@WebSocketGateway({
  cors: {
    origin: '*', // Für Entwicklung, in Produktion genauer spezifizieren!
  },
  // path: '/socket.io', // Standardpfad, kann angepasst werden
  // transports: ['websocket'], // Standardmäßig websocket und polling
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server; // Typ Server von socket.io

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id} from IP ${client.handshake.address}`);
    // Optional: Sende initialen Status bei Verbindung
    // this.sendInitialStatus(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Beispiel für eine Methode, um Nachrichten von Clients zu empfangen
  @SubscribeMessage('requestInitialStatus')
  handleRequestInitialStatus(client: Socket, payload: any): void {
    this.logger.log(`Client ${client.id} requested initial status with payload:`, payload);
    // Hier könnte man den aktuellen Tür- und Belegungsstatus senden
    // z.B. durch Aufruf der entsprechenden Services und dann client.emit(...)
    client.emit('message', 'Initial status will be implemented soon.');
  }

  // Methoden zum Senden von Updates an alle Clients
  public sendDoorStatusUpdate(doorEvent: DoorEvent): void {
    this.logger.log('Sending door status update:', doorEvent);
    this.server.emit(WS_EVENT_DOOR_STATUS_UPDATE, {
      isOpen: doorEvent.doorIsOpen,
      timestamp: doorEvent.eventTimestamp, // oder createdAt für Backend-Zeit
      sensorId: doorEvent.sensorId,
    });
  }

  public sendOccupancyUpdate(occupancyStatus: OccupancyStatusModel): void {
    this.logger.log('Sending occupancy update:', occupancyStatus);
    this.server.emit(WS_EVENT_OCCUPANCY_UPDATE, occupancyStatus);
  }

  // Wenn wir MotionEvents auch pushen wollen:
  // public sendMotionEvent(motionEvent: MotionEvent): void {
  //   this.logger.log('Sending motion event update:', motionEvent);
  //   this.server.emit('motionEventUpdate', motionEvent);
  // }
}
