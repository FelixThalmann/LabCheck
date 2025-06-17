/*
  Warnings:

  - You are about to drop the column `building` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `floor` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `rooms` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "building",
DROP COLUMN "floor",
DROP COLUMN "isActive",
ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT true;
