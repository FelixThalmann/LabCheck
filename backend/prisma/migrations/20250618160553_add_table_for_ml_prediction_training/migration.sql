-- CreateTable
CREATE TABLE "OccupancyEvent" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personCount" INTEGER NOT NULL,
    "isDoorOpen" BOOLEAN NOT NULL,

    CONSTRAINT "OccupancyEvent_pkey" PRIMARY KEY ("id")
);
