"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = void 0;
const prisma_1 = require("../prisma");
const getAuditLogs = async (req, res) => {
    try {
        const { action, entity, page = '1', limit = '50' } = req.query;
        const where = {};
        if (action && action !== 'all') {
            where.action = action;
        }
        if (entity && entity !== 'all') {
            where.entity = { contains: entity, mode: 'insensitive' };
        }
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 50;
        const skip = (pageNum - 1) * limitNum;
        const [totalCount, logs] = await Promise.all([
            prisma_1.prisma.auditLog.count({ where }),
            prisma_1.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            })
        ]);
        res.json({
            success: true,
            logs,
            meta: {
                totalCount,
                page: pageNum,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
};
exports.getAuditLogs = getAuditLogs;
