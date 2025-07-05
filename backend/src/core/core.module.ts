import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DemoDateService } from './services/demo-date.service';

/**
 * Global core module for central services
 * Provides the DemoDateService globally throughout the application
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [DemoDateService],
  exports: [DemoDateService],
})
export class CoreModule {} 