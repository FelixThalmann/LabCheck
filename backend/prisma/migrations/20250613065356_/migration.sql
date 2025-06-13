/*
  Warnings:

  - You are about to drop the `DoorEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LabSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MotionEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PassageEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sensor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MANAGER');

-- DropForeignKey
ALTER TABLE "DoorEvent" DROP CONSTRAINT "DoorEvent_sensorId_fkey";

-- DropForeignKey
ALTER TABLE "MotionEvent" DROP CONSTRAINT "MotionEvent_sensorId_fkey";

-- DropForeignKey
ALTER TABLE "PassageEvent" DROP CONSTRAINT "PassageEvent_sensorId_fkey";

-- DropForeignKey
ALTER TABLE "light_barrier_events" DROP CONSTRAINT "light_barrier_events_sensorId_fkey";

-- DropTable
DROP TABLE "DoorEvent";

-- DropTable
DROP TABLE "LabSetting";

-- DropTable
DROP TABLE "MotionEvent";

-- DropTable
DROP TABLE "PassageEvent";

-- DropTable
DROP TABLE "Sensor";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "building" TEXT,
    "floor" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "room_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" TEXT NOT NULL,
    "esp32Id" TEXT NOT NULL,
    "location" TEXT,
    "sensorType" TEXT NOT NULL DEFAULT 'multi',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "door_events" (
    "id" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "doorIsOpen" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorId" TEXT NOT NULL,

    CONSTRAINT "door_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passage_events" (
    "id" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "direction" "PassageDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorId" TEXT NOT NULL,

    CONSTRAINT "passage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motion_events" (
    "id" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "motionDetected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorId" TEXT NOT NULL,

    CONSTRAINT "motion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "day_predictions" (
    "id" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "occupancy" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "confidence" DOUBLE PRECISION DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "day_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "week_predictions" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "occupancy" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "confidence" DOUBLE PRECISION DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "week_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "room_settings_roomId_key_key" ON "room_settings"("roomId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_esp32Id_key" ON "sensors"("esp32Id");

-- CreateIndex
CREATE UNIQUE INDEX "day_predictions_roomId_date_time_key" ON "day_predictions"("roomId", "date", "time");

-- CreateIndex
CREATE UNIQUE INDEX "week_predictions_roomId_weekStart_day_key" ON "week_predictions"("roomId", "weekStart", "day");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "room_settings" ADD CONSTRAINT "room_settings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "door_events" ADD CONSTRAINT "door_events_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "sensors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passage_events" ADD CONSTRAINT "passage_events_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "sensors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motion_events" ADD CONSTRAINT "motion_events_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "sensors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "light_barrier_events" ADD CONSTRAINT "light_barrier_events_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "sensors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_predictions" ADD CONSTRAINT "day_predictions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_predictions" ADD CONSTRAINT "week_predictions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
