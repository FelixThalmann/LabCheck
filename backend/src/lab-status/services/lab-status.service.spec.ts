import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { LabStatusService } from './lab-status.service';
import { PrismaService } from '../../prisma.service';
import { EventsGateway } from '../../events/events/events.gateway';

describe('LabStatusService', () => {
  let service: LabStatusService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;
  let eventsGateway: jest.Mocked<EventsGateway>;

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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabStatusService,
        {
          provide: PrismaService,
          useValue: {
            room: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            doorEvent: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            sendCapacityUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LabStatusService>(LabStatusService);
    prismaService = module.get(PrismaService) as any;
    configService = module.get(ConfigService) as any;
    eventsGateway = module.get(EventsGateway) as any;

    // Setup default mocks
    (prismaService.room.findFirst as jest.Mock).mockResolvedValue(mockRoom);
    (prismaService.room.update as jest.Mock).mockResolvedValue(mockRoom);
    (prismaService.doorEvent.findFirst as jest.Mock).mockResolvedValue(mockDoorEvent);
    (configService.get as jest.Mock).mockReturnValue('admin123');
    (eventsGateway.sendCapacityUpdate as jest.Mock).mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCombinedLabStatus', () => {
    it('should return correct lab status when room exists', async () => {
      // Arrange
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(mockRoom);

      // Act
      const result = await service.getCombinedLabStatus();

      // Assert
      expect(result).toEqual({
        isOpen: true,
        currentOccupancy: 5,
        maxOccupancy: 20,
        color: 'green', // 5/20 = 25% -> green
        currentDate: expect.any(String),
        lastUpdated: expect.any(String),
      });
      expect(prismaService.room.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should return red color when door is closed', async () => {
      // Arrange
      const closedRoom = { ...mockRoom, isOpen: false };
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(closedRoom);

      // Act
      const result = await service.getCombinedLabStatus();

      // Assert
      expect(result.color).toBe('red');
      expect(result.isOpen).toBe(false);
    });

    it('should calculate yellow color for 50-89% occupancy', async () => {
      // Arrange
      const busyRoom = { ...mockRoom, capacity: 15 }; // 15/20 = 75%
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(busyRoom);

      // Act
      const result = await service.getCombinedLabStatus();

      // Assert
      expect(result.color).toBe('yellow');
      expect(result.currentOccupancy).toBe(15);
    });

    it('should calculate red color for 90%+ occupancy', async () => {
      // Arrange
      const fullRoom = { ...mockRoom, capacity: 18 }; // 18/20 = 90%
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(fullRoom);

      // Act
      const result = await service.getCombinedLabStatus();

      // Assert
      expect(result.color).toBe('red');
      expect(result.currentOccupancy).toBe(18);
    });

    it('should throw BadRequestException when no room exists', async () => {
      // Arrange
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getCombinedLabStatus()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle edge case with zero maxCapacity', async () => {
      // Arrange
      const zeroCapacityRoom = { ...mockRoom, maxCapacity: 0 };
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(zeroCapacityRoom);

      // Act
      const result = await service.getCombinedLabStatus();

      // Assert
      expect(result.color).toBe('red'); // Fallback for invalid capacity
    });
  });

  describe('getLabCapacity', () => {
    it('should return current room capacity', async () => {
      // Arrange
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(mockRoom);

      // Act
      const result = await service.getLabCapacity();

      // Assert
      expect(result).toBe(5);
      expect(prismaService.room.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when no room exists', async () => {
      // Arrange
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getLabCapacity()).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMaxCapacity', () => {
    it('should return max capacity with timestamp', async () => {
      // Arrange
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(mockRoom);

      // Act
      const result = await service.getMaxCapacity();

      // Assert
      expect(result).toEqual({
        capacity: 20,
        lastUpdated: expect.any(String),
      });
      expect(prismaService.room.findFirst).toHaveBeenCalledWith({
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('setLabCapacity', () => {
    beforeEach(() => {
      (configService.get as jest.Mock).mockReturnValue('admin123');
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(mockRoom);
      (prismaService.room.update as jest.Mock).mockResolvedValue({ ...mockRoom, maxCapacity: 25 });
      (prismaService.doorEvent.findFirst as jest.Mock).mockResolvedValue(mockDoorEvent);
      (eventsGateway.sendCapacityUpdate as jest.Mock).mockResolvedValue(undefined);
    });

    it('should successfully update capacity with correct password', async () => {
      // Act
      const result = await service.setLabCapacity(25, 'admin123');

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Laborkapazität erfolgreich auf 25 gesetzt',
      });
      expect(prismaService.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { maxCapacity: 25 },
      });
      expect(eventsGateway.sendCapacityUpdate).toHaveBeenCalledWith(
        25, // new max capacity
        5,  // current occupancy
        true, // door is open
      );
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      // Act & Assert
      await expect(service.setLabCapacity(25, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaService.room.update).not.toHaveBeenCalled();
    });

    it('should handle WebSocket error gracefully', async () => {
      // Arrange
      (eventsGateway.sendCapacityUpdate as jest.Mock).mockRejectedValue(new Error('WebSocket error'));

      // Act
      const result = await service.setLabCapacity(25, 'admin123');

      // Assert
      expect(result.success).toBe(true); // Should still succeed despite WebSocket error
      expect(prismaService.room.update).toHaveBeenCalled();
    });

    it('should use default door status when no door events exist', async () => {
      // Arrange
      (prismaService.doorEvent.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      await service.setLabCapacity(25, 'admin123');

      // Assert
      expect(eventsGateway.sendCapacityUpdate).toHaveBeenCalledWith(
        25,
        5,
        true, // default door status
      );
    });
  });

  describe('login', () => {
    beforeEach(() => {
      (configService.get as jest.Mock).mockReturnValue('admin123');
    });

    it('should return success with correct password', async () => {
      // Act
      const result = await service.login('admin123');

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Login erfolgreich',
      });
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      // Act & Assert
      await expect(service.login('wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should use default password when config is not set', async () => {
      // Arrange
      (configService.get as jest.Mock).mockReturnValue('admin123'); // default value

      // Act
      const result = await service.login('admin123');

      // Assert
      expect(result.success).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('ADMIN_PASSWORD', 'admin123');
    });
  });

  describe('color calculation edge cases', () => {
    it('should handle negative occupancy gracefully', async () => {
      // Arrange
      const negativeRoom = { ...mockRoom, capacity: -1 };
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(negativeRoom);

      // Act
      const result = await service.getCombinedLabStatus();

      // Assert
      expect(result.color).toBe('green'); // Negative percentage should be green
      expect(result.currentOccupancy).toBe(-1);
    });

    it('should handle occupancy exceeding maxCapacity', async () => {
      // Arrange
      const overCapacityRoom = { ...mockRoom, capacity: 25 }; // 25/20 = 125%
      (prismaService.room.findFirst as jest.Mock).mockResolvedValue(overCapacityRoom);

      // Act
      const result = await service.getCombinedLabStatus();

      // Assert
      expect(result.color).toBe('red'); // Over 90% should be red
      expect(result.currentOccupancy).toBe(25);
    });
  });
});
