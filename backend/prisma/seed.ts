import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Datenbank leeren
  await prisma.occupancyEvent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();

  // Raum anlegen
  const room = await prisma.room.create({
    data: {
      name: 'Testlabor',
      description: 'Minimalraum für Seed',
      capacity: 0,
      maxCapacity: 10,
      isOpen: true,
    },
  });

  // Nutzer anlegen
  const user = await prisma.user.create({
    data: {
      email: 'testuser@example.com',
      password: 'testpass', // In Produktion: Passwort hashen!
      name: 'Test User',
      role: UserRole.USER,
      isActive: true,
    },
  });

  // OccupancyEvents anlegen (minimal, aber für ML Training geeignet)
  await prisma.occupancyEvent.createMany({
    data: [
      { timestamp: new Date('2024-06-01T08:00:00Z'), personCount: 1, isDoorOpen: true },
      { timestamp: new Date('2024-06-01T09:00:00Z'), personCount: 2, isDoorOpen: true },
      { timestamp: new Date('2024-06-01T10:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-01T11:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-01T12:00:00Z'), personCount: 1, isDoorOpen: true },
      { timestamp: new Date('2024-06-01T13:00:00Z'), personCount: 0, isDoorOpen: true },
      { timestamp: new Date('2024-06-02T08:00:00Z'), personCount: 1, isDoorOpen: true },
      { timestamp: new Date('2024-06-02T09:00:00Z'), personCount: 4, isDoorOpen: true },
      { timestamp: new Date('2024-06-02T10:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-02T11:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-02T12:00:00Z'), personCount: 1, isDoorOpen: true },
      { timestamp: new Date('2024-06-02T13:00:00Z'), personCount: 0, isDoorOpen: true },
      { timestamp: new Date('2024-06-03T08:00:00Z'), personCount: 1, isDoorOpen: true },
      { timestamp: new Date('2024-06-03T09:00:00Z'), personCount: 2, isDoorOpen: true },
      { timestamp: new Date('2024-06-03T10:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-03T11:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-03T12:00:00Z'), personCount: 8, isDoorOpen: true },
      { timestamp: new Date('2024-06-03T13:00:00Z'), personCount: 0, isDoorOpen: true },
      { timestamp: new Date('2024-06-04T08:00:00Z'), personCount: 1, isDoorOpen: true },
      { timestamp: new Date('2024-06-04T09:00:00Z'), personCount: 2, isDoorOpen: true },
      { timestamp: new Date('2024-06-04T10:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-04T11:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-04T12:00:00Z'), personCount: 1, isDoorOpen: true },
      { timestamp: new Date('2024-06-04T13:00:00Z'), personCount: 0, isDoorOpen: true },
      { timestamp: new Date('2024-06-04T16:00:00Z'), personCount: 5, isDoorOpen: true },
      { timestamp: new Date('2024-06-05T08:00:00Z'), personCount: 1, isDoorOpen: true },
      { timestamp: new Date('2024-06-05T09:00:00Z'), personCount: 2, isDoorOpen: true },
      { timestamp: new Date('2024-06-05T10:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-05T11:00:00Z'), personCount: 0, isDoorOpen: false },
      { timestamp: new Date('2024-06-05T12:00:00Z'), personCount: 3, isDoorOpen: true },
      { timestamp: new Date('2024-06-05T13:00:00Z'), personCount: 0, isDoorOpen: true },
      { timestamp: new Date('2024-06-05T16:00:00Z'), personCount: 8, isDoorOpen: true },
      { timestamp: new Date('2024-06-06T08:00:00Z'), personCount: 1, isDoorOpen: true },
      { timestamp: new Date('2024-06-06T09:00:00Z'), personCount: 2, isDoorOpen: true },
    ],
  });

  console.log('🌱 Minimal Seed abgeschlossen!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
