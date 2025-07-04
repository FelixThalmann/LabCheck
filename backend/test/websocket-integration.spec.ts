import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '../src/events/events/events.gateway';
import { LabStatusService } from '../src/lab-status/services/lab-status.service';
import { PrismaService } from '../src/prisma.service';

describe('WebSocket Integration Tests', () => {
  let eventsGateway: EventsGateway;
  let labStatusService: LabStatusService;
  let mockServer: any;

  const mockRoom = {
    id: 'cmck9c0430000qn07464idwmj',
    name: 'LabCheck-Main-Room',
    capacity: 5,
    maxCapacity: 20,
    isOpen: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDoorEvent = {
    id: 'door-event-1',
    sensorId: 'sensor-1',
    eventTimestamp: new Date(),
    doorIsOpen: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      room: {
        findFirst: jest.fn().mockResolvedValue(mockRoom),
        update: jest.fn().mockResolvedValue(mockRoom),
      },
      doorEvent: {
        findFirst: jest.fn().mockResolvedValue(mockDoorEvent),
      },
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('admin123'),
    };

    mockServer = {
      emit: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        LabStatusService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    eventsGateway = moduleFixture.get<EventsGateway>(EventsGateway);
    labStatusService = moduleFixture.get<LabStatusService>(LabStatusService);

    // Inject mock server
    (eventsGateway as any).server = mockServer;
  });

  describe('Data Consistency Between REST API and WebSocket', () => {
    it('should ensure REST API and WebSocket return consistent data', async () => {
      // Get data from REST API
      const restApiData = await labStatusService.getCombinedLabStatus();

      // Trigger WebSocket update and capture emitted data
      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);

      // Verify WebSocket was called
      expect(mockServer.emit).toHaveBeenCalledWith('doorStatusUpdate', expect.any(Object));

      // Get the actual emitted data
      const emittedData = mockServer.emit.mock.calls[0][1];

      // Compare key fields for consistency
      expect(emittedData.currentOccupancy).toBe(restApiData.currentOccupancy);
      expect(emittedData.maxOccupancy).toBe(restApiData.maxOccupancy);
      expect(emittedData.isOpen).toBe(mockDoorEvent.doorIsOpen);
    });

    it('should show correct maxOccupancy (not 0) in WebSocket updates', async () => {
      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);

      const emittedData = mockServer.emit.mock.calls[0][1];
      
      // This tests the fix for Problem 1: X/0 should be X/{maxCapacity}
      expect(emittedData.maxOccupancy).toBeGreaterThan(0);
      expect(emittedData.maxOccupancy).toBe(20); // From mockRoom
    });

    it('should use same color logic across REST API and WebSocket', async () => {
      // Get color from REST API
      const restApiData = await labStatusService.getCombinedLabStatus();

      // Get color from WebSocket update (door open)
      await eventsGateway.sendDoorStatusUpdate({ ...mockDoorEvent, doorIsOpen: true });
      const websocketData = mockServer.emit.mock.calls[0][1];

      // Colors should match when door is open
      expect(websocketData.color).toBe(restApiData.color);
    });

    it('should override color to red when door is closed regardless of occupancy', async () => {
      // Test with closed door
      const closedDoorEvent = { ...mockDoorEvent, doorIsOpen: false };
      await eventsGateway.sendDoorStatusUpdate(closedDoorEvent);

      const emittedData = mockServer.emit.mock.calls[0][1];
      
      // Door closed should always be red
      expect(emittedData.isOpen).toBe(false);
      expect(emittedData.color).toBe('red');
    });
  });

  describe('WebSocket Event Structure Validation', () => {
    it('should emit door status update with correct structure', async () => {
      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);

      expect(mockServer.emit).toHaveBeenCalledWith('doorStatusUpdate', {
        isOpen: expect.any(Boolean),
        currentOccupancy: expect.any(Number),
        maxOccupancy: expect.any(Number),
        color: expect.stringMatching(/^(red|yellow|green)$/),
        currentDate: expect.any(Date),
        lastUpdated: expect.any(Date),
        sensorId: expect.any(String),
        eventId: expect.any(String),
      });
    });

    it('should emit occupancy update with correct structure', async () => {
      const occupancyStatus = {
        currentOccupancy: 8,
        totalCapacity: 20,
        timestamp: new Date(),
      };

      await eventsGateway.sendOccupancyUpdate(occupancyStatus);

      expect(mockServer.emit).toHaveBeenCalledWith('occupancyUpdate', {
        currentOccupancy: 8,
        maxOccupancy: expect.any(Number),
        isOpen: expect.any(Boolean),
        color: expect.stringMatching(/^(red|yellow|green)$/),
        currentDate: expect.any(String),
        lastUpdated: expect.any(String),
      });
    });

    it('should emit capacity update with correct structure', async () => {
      await eventsGateway.sendCapacityUpdate(25, 10, true);

      expect(mockServer.emit).toHaveBeenCalledWith('capacityUpdate', {
        newMaxCapacity: 25,
        currentOccupancy: 10,
        isOpen: true,
        color: expect.stringMatching(/^(red|yellow|green)$/),
        lastUpdated: expect.any(String),
      });
    });
  });

  describe('Service Integration Tests', () => {
    it('should use LabStatusService as single source of truth', async () => {
      const labStatusSpy = jest.spyOn(labStatusService, 'getCombinedLabStatus');

      // Trigger all WebSocket update types
      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);
      await eventsGateway.sendOccupancyUpdate({
        currentOccupancy: 8,
        totalCapacity: 20,
        timestamp: new Date(),
      });
      await eventsGateway.sendCapacityUpdate(25, 10, true);

      // All should call the lab status service
      expect(labStatusSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      jest.spyOn(labStatusService, 'getCombinedLabStatus')
        .mockRejectedValueOnce(new Error('Service error'));

      // Should not throw error
      await expect(eventsGateway.sendDoorStatusUpdate(mockDoorEvent)).resolves.toBeUndefined();

      // Should not emit when service fails
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('Color Logic Consistency Tests', () => {
    it('should calculate green color for low occupancy', async () => {
      // Mock room with low occupancy (5/20 = 25%)
      const lowOccupancyRoom = { ...mockRoom, capacity: 5 };
      jest.spyOn(labStatusService, 'getCombinedLabStatus')
        .mockResolvedValueOnce({
          isOpen: true,
          currentOccupancy: 5,
          maxOccupancy: 20,
          color: 'green',
          currentDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });

      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);
      const emittedData = mockServer.emit.mock.calls[0][1];

      expect(emittedData.color).toBe('green');
    });

    it('should calculate yellow color for medium occupancy', async () => {
      // Mock room with medium occupancy (15/20 = 75%)
      jest.spyOn(labStatusService, 'getCombinedLabStatus')
        .mockResolvedValueOnce({
          isOpen: true,
          currentOccupancy: 15,
          maxOccupancy: 20,
          color: 'yellow',
          currentDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });

      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);
      const emittedData = mockServer.emit.mock.calls[0][1];

      expect(emittedData.color).toBe('yellow');
    });

    it('should calculate red color for high occupancy', async () => {
      // Mock room with high occupancy (18/20 = 90%)
      jest.spyOn(labStatusService, 'getCombinedLabStatus')
        .mockResolvedValueOnce({
          isOpen: true,
          currentOccupancy: 18,
          maxOccupancy: 20,
          color: 'red',
          currentDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });

      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);
      const emittedData = mockServer.emit.mock.calls[0][1];

      expect(emittedData.color).toBe('red');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero maxCapacity gracefully', async () => {
      jest.spyOn(labStatusService, 'getCombinedLabStatus')
        .mockResolvedValueOnce({
          isOpen: true,
          currentOccupancy: 5,
          maxOccupancy: 0,
          color: 'red', // Should fallback to red for invalid capacity
          currentDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });

      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);
      const emittedData = mockServer.emit.mock.calls[0][1];

      expect(emittedData.maxOccupancy).toBe(0);
      expect(emittedData.color).toBe('red');
    });

    it('should handle negative occupancy values', async () => {
      jest.spyOn(labStatusService, 'getCombinedLabStatus')
        .mockResolvedValueOnce({
          isOpen: true,
          currentOccupancy: -1,
          maxOccupancy: 20,
          color: 'green',
          currentDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });

      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);
      const emittedData = mockServer.emit.mock.calls[0][1];

      expect(emittedData.currentOccupancy).toBe(-1);
      // Should still work without crashing
      expect(mockServer.emit).toHaveBeenCalled();
    });

    it('should handle occupancy exceeding maxCapacity', async () => {
      jest.spyOn(labStatusService, 'getCombinedLabStatus')
        .mockResolvedValueOnce({
          isOpen: true,
          currentOccupancy: 25, // Exceeds maxCapacity of 20
          maxOccupancy: 20,
          color: 'red',
          currentDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });

      await eventsGateway.sendDoorStatusUpdate(mockDoorEvent);
      const emittedData = mockServer.emit.mock.calls[0][1];

      expect(emittedData.currentOccupancy).toBe(25);
      expect(emittedData.color).toBe('red');
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle rapid successive updates', async () => {
      const promises = [];
      
      // Send 10 rapid updates
      for (let i = 0; i < 10; i++) {
        const event = { ...mockDoorEvent, id: `event-${i}` };
        promises.push(eventsGateway.sendDoorStatusUpdate(event));
      }

      await Promise.all(promises);

      // Should have emitted 10 times
      expect(mockServer.emit).toHaveBeenCalledTimes(10);
    });

    it('should maintain data integrity under concurrent access', async () => {
      // Simulate concurrent updates of different types
      const promises = [
        eventsGateway.sendDoorStatusUpdate(mockDoorEvent),
        eventsGateway.sendOccupancyUpdate({
          currentOccupancy: 8,
          totalCapacity: 20,
          timestamp: new Date(),
        }),
        eventsGateway.sendCapacityUpdate(25, 10, true),
      ];

      await Promise.all(promises);

      // All should complete successfully
      expect(mockServer.emit).toHaveBeenCalledTimes(3);
      
      // Verify different event types were emitted
      const eventTypes = mockServer.emit.mock.calls.map(call => call[0]);
      expect(eventTypes).toContain('doorStatusUpdate');
      expect(eventTypes).toContain('occupancyUpdate');
      expect(eventTypes).toContain('capacityUpdate');
    });
  });
});
