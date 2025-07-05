import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DemoDateService } from './services/demo-date.service';

/**
 * @class CoreModule
 * @description Globales Core-Modul für zentrale Services
 * Stellt den DemoDateService global zur Verfügung
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [DemoDateService],
  exports: [DemoDateService],
})
export class CoreModule {} 