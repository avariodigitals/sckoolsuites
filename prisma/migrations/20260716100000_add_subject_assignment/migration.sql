-- CreateTable
CREATE TABLE "subject_assignment" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "teacher_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subject_assignment_school_id_idx" ON "subject_assignment"("school_id");

-- CreateIndex
CREATE INDEX "subject_assignment_teacher_id_idx" ON "subject_assignment"("teacher_id");

-- CreateIndex
CREATE INDEX "subject_assignment_subject_id_idx" ON "subject_assignment"("subject_id");

-- CreateIndex
CREATE INDEX "subject_assignment_class_id_idx" ON "subject_assignment"("class_id");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX "subject_assignment_teacher_id_subject_id_class_id_key" ON "subject_assignment"("teacher_id", "subject_id", "class_id");

-- AddForeignKey
ALTER TABLE "subject_assignment" ADD CONSTRAINT "subject_assignment_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_assignment" ADD CONSTRAINT "subject_assignment_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_assignment" ADD CONSTRAINT "subject_assignment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_assignment" ADD CONSTRAINT "subject_assignment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
