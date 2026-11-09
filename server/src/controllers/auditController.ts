import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuditAction } from '@prisma/client';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, entity, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (action && action !== 'all') {
      where.action = action as AuditAction;
    }
    if (entity && entity !== 'all') {
      where.entity = { contains: entity as string, mode: 'insensitive' };
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};
