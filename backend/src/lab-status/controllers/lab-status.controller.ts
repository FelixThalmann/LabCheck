/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { LabStatusService } from '../services/lab-status.service';
import { 
  LabStatusResponseDto, 
  LabCapacityResponseDto, 
  LabSettingResponseDto,
  SetLabCapacityDto,
  SetCurrentLabCapacityDto,
  SetEntranceDirectionDto,
  LoginDto,
} from '../dto';

/**
 * @class LabStatusController
 * @description Erweiterte REST Controller für Laborstatus-Endpunkte
 * Implementiert die API-Spezifikation für /api/lab/* mit vollständiger GraphQL-Migration
 */
@Controller('api/lab')
@ApiTags('🏠 Lab Status')
@ApiSecurity('api-key')
export class LabStatusController {
  private readonly logger = new Logger(LabStatusController.name);

  constructor(private readonly labStatusService: LabStatusService) {}

  /**
   * @method getLabStatus
   * @description Liefert den aktuellen Status und die Belegung des Labors
   * Entspricht GET /api/lab/status aus der API-Dokumentation
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get Laboratory Status',
    description: 'Returns current laboratory status and occupancy information',
  })
  @ApiResponse({
    status: 200,
    description: 'Laboratory status retrieved successfully',
    type: LabStatusResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getLabStatus(): Promise<LabStatusResponseDto> {
    this.logger.debug('REST API: GET /api/lab/status');
    return this.labStatusService.getCombinedLabStatus();
  }

  /**
   * @method getLabCapacity
   * @description Liefert die aktuelle Laborkapazität
   * Entspricht der GraphQL labCapacity Query
   */
  @Get('capacity')
  @ApiOperation({
    summary: 'Get Laboratory Capacity',
    description: 'Returns the currently configured laboratory capacity',
  })
  @ApiResponse({
    status: 200,
    description: 'Laboratory capacity retrieved successfully',
    type: LabCapacityResponseDto,
  })
  async getLabCapacity(): Promise<number> {
    this.logger.debug('REST API: GET /api/lab/capacity');
    return this.labStatusService.getLabCapacity();
  }

  /**
   * @method setLabCapacity
   * @description Setzt die Laborkapazität mit Passwort-Schutz
   * Entspricht der GraphQL setLabCapacity Mutation mit zusätzlicher Sicherheit
   */
  @Post('capacity')
  @ApiOperation({
    summary: 'Set Laboratory Capacity',
    description: 'Sets the laboratory capacity with administrator password protection',
  })
  @ApiResponse({
    status: 200,
    description: 'Laboratory capacity set successfully',
    type: LabSettingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid administrator password',
  })
  async setLabCapacity(
    @Body() setCapacityDto: SetLabCapacityDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.debug(`REST API: POST /api/lab/capacity - capacity: ${setCapacityDto.capacity}`);
    return this.labStatusService.setLabCapacity(
      setCapacityDto.capacity,
      setCapacityDto.password,
    );
  }

  @Post('current-capacity')
  @ApiOperation({
    summary: 'Set Current Laboratory Capacity',
    description: 'Sets the current laboratory capacity with password protection',
  })
  @ApiResponse({
    status: 200,
    description: 'Current laboratory capacity set successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid password',
  })
  async setCurrentCapacity(
    @Body() setCapacityDto: SetCurrentLabCapacityDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.debug(`REST API: POST /api/lab/current-capacity - capacity: ${setCapacityDto.capacity}`);
    return this.labStatusService.setCurrentCapacity(
      setCapacityDto.capacity,
      setCapacityDto.password,
    );
  }

  @Post('entrance-direction')
  @ApiOperation({
    summary: 'Set Entrance Direction',
    description: 'Sets the entrance direction for the laboratory',
  })
  @ApiResponse({
    status: 200,
    description: 'Entrance direction set successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid password',
  })
  async setEntranceDirection(
    @Body() setEntranceDirectionDto: SetEntranceDirectionDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.debug(`REST API: POST /api/lab/entrance-direction - password: ${setEntranceDirectionDto.password}`);
    return this.labStatusService.setEntranceDirection(
      setEntranceDirectionDto.password,
    );
  }

  /**
   * @method login
   * @description Login
   */
  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description: 'Authenticate with administrator password',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid password',
  })
  async login(@Body() loginDto: LoginDto): Promise<{ success: boolean; message: string }> {
    return this.labStatusService.login(loginDto.password);
  }
}
