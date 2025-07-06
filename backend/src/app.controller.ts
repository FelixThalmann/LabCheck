import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * Main application controller
 * Provides basic health check and status endpoints
 */
@Controller()
@ApiTags('🔍 Health Check')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint
   * @returns Simple hello message to verify the service is running
   */
  @Get()
  @ApiOperation({
    summary: 'Health Check',
    description: 'Basic health check endpoint to verify the service is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is running',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
