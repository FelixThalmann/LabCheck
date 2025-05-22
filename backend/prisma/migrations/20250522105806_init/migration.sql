-- CreateEnum
CREATE TYPE "PassageDirection" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "Sensor" (
    "id" TEXT NOT NULL,
    "esp32Id" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoorEvent" (
    "id" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "doorIsOpen" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorId" TEXT NOT NULL,

    CONSTRAINT "DoorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassageEvent" (
    "id" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "direction" "PassageDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorId" TEXT NOT NULL,

    CONSTRAINT "PassageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotionEvent" (
    "id" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "motionDetected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorId" TEXT NOT NULL,

    CONSTRAINT "MotionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_esp32Id_key" ON "Sensor"("esp32Id");

-- AddForeignKey
ALTER TABLE "DoorEvent" ADD CONSTRAINT "DoorEvent_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassageEvent" ADD CONSTRAINT "PassageEvent_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotionEvent" ADD CONSTRAINT "MotionEvent_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
