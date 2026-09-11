-- CreateTable
CREATE TABLE "grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "grantedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grants_userId_idx" ON "grants"("userId");

-- CreateIndex
CREATE INDEX "grants_assignmentId_idx" ON "grants"("assignmentId");

-- AddForeignKey
ALTER TABLE "grants" ADD CONSTRAINT "grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grants" ADD CONSTRAINT "grants_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grants" ADD CONSTRAINT "grants_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
