-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'TEST_EVENT';

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "entranceDirection" TEXT DEFAULT 'left';
