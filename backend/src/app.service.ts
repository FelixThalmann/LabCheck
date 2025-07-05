import { Injectable } from '@nestjs/common';

/**
 * Main application service
 * Provides basic application functionality and health checks
 */
@Injectable()
export class AppService {
  /**
   * Returns a simple hello message for health checks
   * @returns Hello World message
   */
  getHello(): string {
    return 'Hello World!';
  }
}
