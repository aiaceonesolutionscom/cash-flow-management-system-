import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { CategoryType, AuditAction } from '@prisma/client';
import { createAuditLog } from '../utils/audit';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, type } = req.query;

    const where: any = {};
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      where.type = type as CategoryType;
    }

    if (companyId && companyId !== 'all') {
      where.OR = [
        { companyId: companyId as string },
        { companyId: null }
      ];
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, code: true }
        },
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

    // When "All Companies" is selected, deduplicate by category name and type
    // so common categories like "Office Rent" or "Salaries" appear EXACTLY ONCE!
    if (!companyId || companyId === 'all') {
      const uniqueMap = new Map<string, any>();
      for (const cat of categories) {
        const key = `${cat.name.trim().toLowerCase()}_${cat.type}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            ...cat,
            company: null,
            _count: {
              transactions: cat._count?.transactions || 0
            }
          });
        } else {
          // Combine transaction counts across all companies
          const existing = uniqueMap.get(key);
          existing._count.transactions += (cat._count?.transactions || 0);
        }
      }
      res.json({ success: true, categories: Array.from(uniqueMap.values()) });
      return;
    }

    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, companyId } = req.body;

    if (!name || !type) {
      res.status(400).json({ success: false, message: 'Name and type are required' });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        type: type as CategoryType,
        companyId: companyId || null,
        isDefault: false
      }
    });

    await createAuditLog({
      action: AuditAction.CREATE,
      entity: 'CATEGORY',
      entityId: category.id,
      details: { name: category.name, type: category.type },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, category });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, message: 'A category with this name already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type, companyId } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    const data: any = { name: name.trim() };
    if (type) data.type = type;
    if (companyId !== undefined) data.companyId = companyId ? companyId : null;

    const category = await prisma.category.update({
      where: { id },
      data
    });

    await createAuditLog({
      action: AuditAction.UPDATE,
      entity: 'CATEGORY',
      entityId: category.id,
      details: { newName: category.name, type: category.type },
      ipAddress: req.ip
    });

    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    if (category._count.transactions > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete category because it is currently linked to ${category._count.transactions} transaction(s).`
      });
      return;
    }

    await prisma.category.delete({ where: { id } });

    await createAuditLog({
      action: AuditAction.DELETE,
      entity: 'CATEGORY',
      entityId: id,
      details: { deletedCategory: category.name },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};
