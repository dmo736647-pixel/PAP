-- CreateEnum
CREATE TYPE "AlphaInviteStatus" AS ENUM ('invited', 'accepted', 'revoked');

-- CreateEnum
CREATE TYPE "GoogleSyncStatus" AS ENUM ('running', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "PapWorkspaceSource" AS ENUM ('demo', 'google');

-- CreateEnum
CREATE TYPE "PapWorkspaceStatus" AS ENUM ('generated', 'stale', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlphaInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "AlphaInviteStatus" NOT NULL DEFAULT 'invited',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "AlphaInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleAccountId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "GoogleCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleSyncRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GoogleSyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "gmailMessageCount" INTEGER NOT NULL DEFAULT 0,
    "calendarEventCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GoogleSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleEmailSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleMessageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" JSONB NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "labels" JSONB NOT NULL,
    "rawMetadataJson" JSONB NOT NULL,
    "syncRunId" TEXT NOT NULL,

    CONSTRAINT "GoogleEmailSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarEventSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "attendees" JSONB NOT NULL,
    "rawMetadataJson" JSONB NOT NULL,
    "syncRunId" TEXT NOT NULL,

    CONSTRAINT "GoogleCalendarEventSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PapWorkspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "PapWorkspaceSource" NOT NULL,
    "status" "PapWorkspaceStatus" NOT NULL DEFAULT 'generated',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "briefingJson" JSONB NOT NULL,
    "pendingActionsJson" JSONB NOT NULL,
    "automaticallyHandledJson" JSONB NOT NULL,
    "meetingSuggestionsJson" JSONB NOT NULL,
    "auditEventsJson" JSONB NOT NULL,

    CONSTRAINT "PapWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AlphaInvite_email_key" ON "AlphaInvite"("email");

-- CreateIndex
CREATE INDEX "GoogleCredential_userId_idx" ON "GoogleCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCredential_userId_googleAccountId_key" ON "GoogleCredential"("userId", "googleAccountId");

-- CreateIndex
CREATE INDEX "GoogleSyncRun_userId_startedAt_idx" ON "GoogleSyncRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "GoogleEmailSnapshot_userId_receivedAt_idx" ON "GoogleEmailSnapshot"("userId", "receivedAt");

-- CreateIndex
CREATE INDEX "GoogleEmailSnapshot_syncRunId_idx" ON "GoogleEmailSnapshot"("syncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleEmailSnapshot_userId_googleMessageId_key" ON "GoogleEmailSnapshot"("userId", "googleMessageId");

-- CreateIndex
CREATE INDEX "GoogleCalendarEventSnapshot_userId_startsAt_idx" ON "GoogleCalendarEventSnapshot"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "GoogleCalendarEventSnapshot_syncRunId_idx" ON "GoogleCalendarEventSnapshot"("syncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarEventSnapshot_userId_googleEventId_key" ON "GoogleCalendarEventSnapshot"("userId", "googleEventId");

-- CreateIndex
CREATE INDEX "PapWorkspace_userId_generatedAt_idx" ON "PapWorkspace"("userId", "generatedAt");

-- AddForeignKey
ALTER TABLE "GoogleCredential" ADD CONSTRAINT "GoogleCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleSyncRun" ADD CONSTRAINT "GoogleSyncRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleEmailSnapshot" ADD CONSTRAINT "GoogleEmailSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleEmailSnapshot" ADD CONSTRAINT "GoogleEmailSnapshot_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "GoogleSyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarEventSnapshot" ADD CONSTRAINT "GoogleCalendarEventSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarEventSnapshot" ADD CONSTRAINT "GoogleCalendarEventSnapshot_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "GoogleSyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PapWorkspace" ADD CONSTRAINT "PapWorkspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
