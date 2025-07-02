import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { LabStatusService } from '../../lab-status/services/lab-status.service';
import { Server, Socket } from 'socket.io';
import { DoorEvent } from '@prisma/client';
import { OccupancyStatusDto } from '../../door/models';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let labStatusService: jest.Mocked<LabStatusService>;
  let mockServer: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;

  const mockLabStatus = {
    isOpen: true,
    currentOccupancy: 5,
    maxOccupancy: 20,
    color: 'green',
    currentDate: '2024-01-15T14:30:00.000Z',
    lastUpdated: '2024-01-15T14:30:00.000Z',
  };

  const mockDoorEvent: DoorEvent = {
    id: 'door-event-1',
    sensorId: 'sensor-1',
    eventTimestamp: new Date('2024-01-15T14:30:00.000Z'),
    doorIsOpen: true,
    createdAt: new Date('2024-01-15T14:30:00.000Z'),
  };

  const mockOccupancyStatus: OccupancyStatusDto = {
    currentOccupancy: 8,
    totalCapacity: 20,
    timestamp: new Date('2024-01-15T14:30:00.000Z'),
  };

  beforeEach(async () => {
    const mockLabStatusService = {
      getCombinedLabStatus: jest.fn().mockResolvedValue(mockLabStatus),
    };

    mockServer = {
      emit: jest.fn(),
    } as any;

    mockSocket = {
      id: 'socket-123',
      handshake: { address: '127.0.0.1' },
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        {
          provide: LabStatusService,
          useValue: mockLabStatusService,
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    labStatusService = module.get(LabStatusService) as jest.Mocked<LabStatusService>;

    // Inject mock server
    (gateway as any).server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('lifecycle hooks', () => {
    it('should log initialization', () => {
      const logSpy = jest.spyOn((gateway as any).logger, 'log');
      
      gateway.afterInit(mockServer);
      
      expect(logSpy).toHaveBeenCalledWith('WebSocket Gateway initialized');
    });

    it('should log client connection', () => {
      const logSpy = jest.spyOn((gateway as any).logger, 'log');
      
      gateway.handleConnection(mockSocket);
      
      expect(logSpy).toHaveBeenCalledWith(
        'Client connected: socket-123 from IP 127.0.0.1'
      );
    });

    it('should log client disconnection', () => {
      const logSpy = jest.spyOn((gateway as any).logger, 'log');
      
      gateway.handleDisconnect(mockSocket);
      
      expect(logSpy).toHaveBeenCalledWith('Client disconnected: socket-123');
    });
  });

  describe('handleRequestInitialStatus', () => {
    it('should log request and emit placeholder message', () => {
      const logSpy = jest.spyOn((gateway as any).logger, 'log');
      const payload = { test: 'data' };
      
      gateway.handleRequestInitialStatus(mockSocket, payload);
      
      expect(logSpy).toHaveBeenCalledWith(
        'Client socket-123 requested initial status with payload:',
        payload
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'message',
        'Initial status will be implemented soon.'
      );
    });
  });

  describe('sendDoorStatusUpdate', () => {
    it('should broadcast door status update with lab status data', async () => {
      // Act
      await gateway.sendDoorStatusUpdate(mockDoorEvent);

      // Assert
      expect(labStatusService.getCombinedLabStatus).toHaveBeenCalledTimes(1);
      expect(mockServer.emit).toHaveBeenCalledWith('doorStatusUpdate', {
        isOpen: true,
        currentOccupancy: 5,
        maxOccupancy: 20,
        color: 'green',
        currentDate: mockDoorEvent.eventTimestamp,
        lastUpdated: mockDoorEvent.eventTimestamp,
        sensorId: 'sensor-1',
        eventId: 'door-event-1',
      });
    });

    it('should override color to red when door is closed', async () => {
      // Arrange
      const closedDoorEvent = { ...mockDoorEvent, doorIsOpen: false };

      // Act
      await gateway.sendDoorStatusUpdate(closedDoorEvent);

      // Assert
      expect(mockServer.emit).toHaveBeenCalledWith('doorStatusUpdate', {
        isOpen: false,
        currentOccupancy: 5,
        maxOccupancy: 20,
        color: 'red', // Should be red regardless of lab status color
        currentDate: closedDoorEvent.eventTimestamp,
        lastUpdated: closedDoorEvent.eventTimestamp,
        sensorId: 'sensor-1',
        eventId: 'door-event-1',
      });
    });

    it('should handle lab status service error gracefully', async () => {
      // Arrange
      const error = new Error('Lab status service error');
      labStatusService.getCombinedLabStatus.mockRejectedValue(error);
      const errorSpy = jest.spyOn((gateway as any).logger, 'error');

      // Act
      await gateway.sendDoorStatusUpdate(mockDoorEvent);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send door status update for event door-event-1:',
        error
      );
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should log verbose information about broadcast', async () => {
      // Arrange
      const verboseSpy = jest.spyOn((gateway as any).logger, 'verbose');

      // Act
      await gateway.sendDoorStatusUpdate(mockDoorEvent);

      // Assert
      expect(verboseSpy).toHaveBeenCalledWith(
        'Broadcasting door status: isOpen=true, occupancy=5/20, color=green'
      );
    });
  });

  describe('sendOccupancyUpdate', () => {
    it('should broadcast occupancy update with lab status data', async () => {
      // Act
      await gateway.sendOccupancyUpdate(mockOccupancyStatus);

      // Assert
      expect(labStatusService.getCombinedLabStatus).toHaveBeenCalledTimes(1);
      expect(mockServer.emit).toHaveBeenCalledWith('occupancyUpdate', {
        currentOccupancy: 5, // Always from lab status service (Single Source of Truth)
        maxOccupancy: 20,    // From lab status
        isOpen: true,        // From lab status
        color: 'green',      // From lab status
        currentDate: expect.any(String),
        lastUpdated: expect.any(String),
      });
    });

    it('should handle lab status service error gracefully', async () => {
      // Arrange
      const error = new Error('Lab status service error');
      labStatusService.getCombinedLabStatus.mockRejectedValue(error);
      const errorSpy = jest.spyOn((gateway as any).logger, 'error');

      // Act
      await gateway.sendOccupancyUpdate(mockOccupancyStatus);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith('Failed to send occupancy update:', error);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should log verbose information about broadcast', async () => {
      // Arrange
      const verboseSpy = jest.spyOn((gateway as any).logger, 'verbose');

      // Act
      await gateway.sendOccupancyUpdate(mockOccupancyStatus);

      // Assert
      expect(verboseSpy).toHaveBeenCalledWith(
        'Broadcasting occupancy update: occupancy=8, maxOccupancy=20, isOpen=true, color=green'
      );
    });
  });

  describe('sendCapacityUpdate', () => {
    it('should broadcast capacity update with consistent color logic', async () => {
      // Act
      await gateway.sendCapacityUpdate(25, 10, true);

      // Assert
      expect(labStatusService.getCombinedLabStatus).toHaveBeenCalledTimes(1);
      expect(mockServer.emit).toHaveBeenCalledWith('capacityUpdate', {
        newMaxCapacity: 25,
        currentOccupancy: 10,
        isOpen: true,
        color: 'green', // From lab status service
        lastUpdated: expect.any(String),
      });
    });

    it('should override color to red when door is closed', async () => {
      // Act
      await gateway.sendCapacityUpdate(25, 10, false);

      // Assert
      expect(mockServer.emit).toHaveBeenCalledWith('capacityUpdate', {
        newMaxCapacity: 25,
        currentOccupancy: 10,
        isOpen: false,
        color: 'red', // Should be red when door is closed
        lastUpdated: expect.any(String),
      });
    });

    it('should handle lab status service error gracefully', async () => {
      // Arrange
      const error = new Error('Lab status service error');
      labStatusService.getCombinedLabStatus.mockRejectedValue(error);
      const errorSpy = jest.spyOn((gateway as any).logger, 'error');

      // Act
      await gateway.sendCapacityUpdate(25, 10, true);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith('Failed to send capacity update:', error);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should log verbose information about broadcast', async () => {
      // Arrange
      const verboseSpy = jest.spyOn((gateway as any).logger, 'verbose');

      // Act
      await gateway.sendCapacityUpdate(25, 10, true);

      // Assert
      expect(verboseSpy).toHaveBeenCalledWith(
        'Broadcasting capacity update: newMaxCapacity=25, currentOccupancy=10, isOpen=true, color=green'
      );
    });
  });

  describe('integration scenarios', () => {
    it('should maintain consistency between different update types', async () => {
      // Test that all update methods use the same lab status service
      await gateway.sendDoorStatusUpdate(mockDoorEvent);
      await gateway.sendOccupancyUpdate(mockOccupancyStatus);
      await gateway.sendCapacityUpdate(25, 10, true);

      // All three methods should have called the lab status service
      expect(labStatusService.getCombinedLabStatus).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid successive updates without interference', async () => {
      // Simulate rapid updates
      const promises = [
        gateway.sendDoorStatusUpdate(mockDoorEvent),
        gateway.sendOccupancyUpdate(mockOccupancyStatus),
        gateway.sendCapacityUpdate(25, 10, true),
      ];

      await Promise.all(promises);

      // All updates should complete successfully
      expect(mockServer.emit).toHaveBeenCalledTimes(3);
      expect(labStatusService.getCombinedLabStatus).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle null door event gracefully', async () => {
      // This test ensures the gateway doesn't crash with unexpected input
      const nullEvent = null as any;
      
      await expect(gateway.sendDoorStatusUpdate(nullEvent)).rejects.toThrow();
    });

    it('should handle undefined occupancy status gracefully', async () => {
      const undefinedStatus = undefined as any;
      
      // This should not throw since the gateway doesn't validate input
      await gateway.sendOccupancyUpdate(undefinedStatus);
      
      // Should still call the lab status service
      expect(labStatusService.getCombinedLabStatus).toHaveBeenCalled();
    });

    it('should handle negative capacity values', async () => {
      // Should not crash with negative values
      await gateway.sendCapacityUpdate(-5, -2, true);
      
      expect(mockServer.emit).toHaveBeenCalled();
    });
  });
});
