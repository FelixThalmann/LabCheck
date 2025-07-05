import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma service for database operations
 * Handles database connection lifecycle and provides Prisma client functionality
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      // Optional: PrismaClient configuration, e.g., logging
      // log: ['query', 'info', 'warn', 'error'],
    });
  }

  /**
   * Establishes database connection when the module initializes
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Closes database connection when the application shuts down
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Optional: Clean-up logic for test databases could be implemented here
  // async cleanDatabase() { ... }
}
