import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
// Da PrismaModule global ist, muss es hier nicht explizit importiert werden,
// vorausgesetzt, es ist im AppModule importiert.

@Module({
  providers: [UsersService],
  exports: [UsersService], // Wichtig, damit andere Module (z.B. AuthModule) den UsersService verwenden können
})
export class UsersModule {} 