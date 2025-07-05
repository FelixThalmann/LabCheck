import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Main application controller
 * Provides basic health check and status endpoints
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint
   * @returns Simple hello message to verify the service is running
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
