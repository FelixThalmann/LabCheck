-- CreateTable
CREATE TABLE "room_occupancy_history" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "occupancy" INTEGER NOT NULL,
    "previousOccupancy" INTEGER,
    "eventType" "PassageDirection" NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_occupancy_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_occupancy_history_roomId_eventTimestamp_idx" ON "room_occupancy_history"("roomId", "eventTimestamp");

-- AddForeignKey
ALTER TABLE "room_occupancy_history" ADD CONSTRAINT "room_occupancy_history_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
