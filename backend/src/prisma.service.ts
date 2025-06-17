import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      // Optional: Konfigurationen für den PrismaClient, z.B. Logging
      // log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    // Stellt sicher, dass beim Start des Moduls eine Verbindung zur DB aufgebaut wird.
    await this.$connect();
  }

  async onModuleDestroy() {
    // Schließt die DB-Verbindung, wenn die Anwendung herunterfährt.
    await this.$disconnect();
  }

  // Optional: Clean-Up Logik für Test-Datenbanken etc. könnte hier implementiert werden
  // async cleanDatabase() { ... }
}
