import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async findOneById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    // Das Passwort-Hashing sollte im AuthService erfolgen, bevor diese Methode aufgerufen wird.
    // Dieser Service bleibt "dumm" bezüglich der Passwortbehandlung.
    return await this.prisma.user.create({ data });
  }

  // Hier könnten später Methoden zum Aktualisieren oder Löschen von Benutzern hinzukommen.
} 