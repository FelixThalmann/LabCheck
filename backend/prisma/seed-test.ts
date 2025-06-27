import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

function generateOccupancyEvents(startDate: Date, days: number, intervalHours: number) {
  const events: { timestamp: Date; personCount: number; isDoorOpen: boolean }[] = [];
  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < 24; hour += intervalHours) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      currentDate.setHours(hour, 0, 0, 0);

      const isWeekend = currentDate.getDay() === 6 || currentDate.getDay() === 0;
      const isOpenTime = hour >= 8 && hour < 18;
      let isDoorOpen: boolean, personCount: number;

      if (isWeekend || !isOpenTime) {
        isDoorOpen = false;
        personCount = 0;
      } else {
        // Door is mostly open, but sometimes closed (lightly randomised)
        isDoorOpen = Math.random() < 0.9; // 90% Chance, that the door is open
        
        // Different occupancy based on weekday
        const weekday = currentDate.getDay();
        let maxOccupancy: number;
        
        switch (weekday) {
          case 1: // Monday - less people
            maxOccupancy = 4;
            break;
          case 3: // Wednesday - more people
            maxOccupancy = 10;
            break;
          case 5: // Friday - less people
            maxOccupancy = 3;
            break;
          default: // Tuesday, Thursday - random occupancy
            maxOccupancy = Math.floor(Math.random() * 11); // 0-10 zufällig
            break;
        }
        
        personCount = isDoorOpen ? Math.floor(Math.random() * (maxOccupancy + 1)) : 0; // 0 bis maxOccupancy Leute
      }

      events.push({
        timestamp: currentDate,
        personCount: personCount,
        isDoorOpen: isDoorOpen,
      });
    }
  }
  return events;
}

async function main() {
  // Clear database
  await prisma.occupancyEvent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();

  // Create room
  const room = await prisma.room.create({
    data: {
      name: 'Testlabor',
      description: 'Minimal room for seed',
      capacity: 0,
      maxCapacity: 10,
      isOpen: true,
    },
  });

  // Create user
  const user = await prisma.user.create({
    data: {
      email: 'testuser@example.com',
      password: 'testpass', // In Produktion: Passwort hashen!
      name: 'Test User',
      role: UserRole.USER,
      isActive: true,
    },
  });

  // Trainingsdata for 3 weeks (Startdate z.B. today)
  const startDate = new Date('2025-04-01T00:00:00Z');
  const occupancyEvents = generateOccupancyEvents(startDate, 56, 2); // 8 Weeks = 56 Days, every 2 hours

  // Create OccupancyEvents
  await prisma.occupancyTrainingData.createMany({
    data: occupancyEvents.map((event) => ({
      timestamp: event.timestamp,
      occupancy: event.personCount,
      occupancyChange: event.personCount,
      hourOfDay: event.timestamp.getHours(),
      dayOfWeek: event.timestamp.getDay(),
      isHoliday: false,
      doorIsOpen: event.isDoorOpen,
    })),
  });

  console.log('🌱 Minimal Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
