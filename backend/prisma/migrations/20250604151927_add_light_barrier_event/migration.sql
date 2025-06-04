-- CreateTable
CREATE TABLE "light_barrier_events" (
    "id" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isInterrupted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorId" TEXT NOT NULL,

    CONSTRAINT "light_barrier_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "light_barrier_events" ADD CONSTRAINT "light_barrier_events_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
