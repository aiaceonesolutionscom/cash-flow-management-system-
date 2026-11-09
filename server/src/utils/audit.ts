import { AuditAction } from '@prisma/client';
import { prisma } from '../prisma';

export async function createAuditLog(params: {
  action: AuditAction;
  entity: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details || {},
        ipAddress: params.ipAddress
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
