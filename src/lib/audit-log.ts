import { prisma } from "@/lib/db";

type AuditInput = {
  schoolId: string;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, any>;
  details?: string;
};

export async function createAuditLog(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.details ? { details: input.details } : input.metadata,
    },
  });
}
