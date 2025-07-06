-- CreateTable
CREATE TABLE "occupancy_training_data" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "occupancy" INTEGER NOT NULL,
    "occupancyChange" INTEGER NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isHoliday" BOOLEAN NOT NULL,
    "doorIsOpen" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT,

    CONSTRAINT "occupancy_training_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "occupancy_training_data_timestamp_idx" ON "occupancy_training_data"("timestamp");

-- CreateIndex
CREATE INDEX "occupancy_training_data_roomId_timestamp_idx" ON "occupancy_training_data"("roomId", "timestamp");

-- AddForeignKey
ALTER TABLE "occupancy_training_data" ADD CONSTRAINT "occupancy_training_data_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
