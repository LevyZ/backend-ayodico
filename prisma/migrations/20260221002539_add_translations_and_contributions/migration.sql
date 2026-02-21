-- CreateEnum
CREATE TYPE "TranslationDirection" AS ENUM ('FR_TO_BHETE', 'BHETE_TO_FR');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContributionAction" AS ENUM ('CREATED', 'UPDATED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "frenchTerm" TEXT NOT NULL,
    "bheteTerm" TEXT NOT NULL,
    "toneNotation" TEXT NOT NULL,
    "direction" "TranslationDirection" NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "contributorId" TEXT,
    "regionId" TEXT,
    "cantonId" TEXT,
    "approvedById" TEXT,
    "contextOrMeaning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_history" (
    "id" TEXT NOT NULL,
    "translationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "ContributionAction" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_cantonId_fkey" FOREIGN KEY ("cantonId") REFERENCES "cantons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_history" ADD CONSTRAINT "contribution_history_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_history" ADD CONSTRAINT "contribution_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
