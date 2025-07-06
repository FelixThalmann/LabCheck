/*
  Warnings:

  - You are about to drop the `OccupancyEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `door_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lab_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `light_barrier_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `motion_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `occupancy_training_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `passage_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_occupancy_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('DOOR_EVENT', 'PASSAGE_EVENT');

-- DropForeignKey
ALTER TABLE "door_events" DROP CONSTRAINT "door_events_sensorId_fkey";

-- DropForeignKey
ALTER TABLE "light_barrier_events" DROP CONSTRAINT "light_barrier_events_sensorId_fkey";

-- DropForeignKey
ALTER TABLE "motion_events" DROP CONSTRAINT "motion_events_sensorId_fkey";

-- DropForeignKey
ALTER TABLE "occupancy_training_data" DROP CONSTRAINT "occupancy_training_data_roomId_fkey";

-- DropForeignKey
ALTER TABLE "passage_events" DROP CONSTRAINT "passage_events_sensorId_fkey";

-- DropForeignKey
ALTER TABLE "room_occupancy_history" DROP CONSTRAINT "room_occupancy_history_roomId_fkey";

-- DropForeignKey
ALTER TABLE "room_settings" DROP CONSTRAINT "room_settings_roomId_fkey";

-- DropTable
DROP TABLE "OccupancyEvent";

-- DropTable
DROP TABLE "door_events";

-- DropTable
DROP TABLE "lab_settings";

-- DropTable
DROP TABLE "light_barrier_events";

-- DropTable
DROP TABLE "motion_events";

-- DropTable
DROP TABLE "occupancy_training_data";

-- DropTable
DROP TABLE "passage_events";

-- DropTable
DROP TABLE "room_occupancy_history";

-- DropTable
DROP TABLE "room_settings";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "PassageDirection";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personCount" INTEGER NOT NULL,
    "isDoorOpen" BOOLEAN NOT NULL,
    "eventType" "EventType" NOT NULL,
    "sensorId" TEXT NOT NULL,
    "roomId" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
