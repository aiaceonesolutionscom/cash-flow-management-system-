"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const prisma_1 = require("../prisma");
async function createAuditLog(params) {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                details: params.details || {},
                ipAddress: params.ipAddress
            }
        });
    }
    catch (err) {
        console.error('Failed to write audit log:', err);
    }
}
