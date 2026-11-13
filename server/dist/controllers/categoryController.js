"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = void 0;
const prisma_1 = require("../prisma");
const client_1 = require("@prisma/client");
const audit_1 = require("../utils/audit");
const getCategories = async (req, res) => {
    try {
        const { companyId, type } = req.query;
        const where = {};
        if (type && (type === 'INCOME' || type === 'EXPENSE')) {
            where.type = type;
        }
        if (companyId && companyId !== 'all') {
            where.OR = [
                { companyId: companyId },
                { companyId: null }
            ];
        }
        const categories = await prisma_1.prisma.category.findMany({
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
                { createdAt: 'desc' }
            ]
        });
        // When "All Companies" is selected, deduplicate by category name and type
        // so common categories like "Office Rent" or "Salaries" appear EXACTLY ONCE!
        if (!companyId || companyId === 'all') {
            const uniqueMap = new Map();
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
                }
                else {
                    // Combine transaction counts across all companies
                    const existing = uniqueMap.get(key);
                    existing._count.transactions += (cat._count?.transactions || 0);
                }
            }
            res.json({ success: true, categories: Array.from(uniqueMap.values()) });
            return;
        }
        res.json({ success: true, categories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};
exports.getCategories = getCategories;
const createCategory = async (req, res) => {
    try {
        const { name, type, companyId } = req.body;
        if (!name || !type) {
            res.status(400).json({ success: false, message: 'Name and type are required' });
            return;
        }
        const category = await prisma_1.prisma.category.create({
            data: {
                name: name.trim(),
                type: type,
                companyId: companyId || null,
                isDefault: false
            }
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.CREATE,
            entity: 'CATEGORY',
            entityId: category.id,
            details: { name: category.name, type: category.type },
            ipAddress: req.ip
        });
        res.status(201).json({ success: true, category });
    }
    catch (error) {
        if (error.code === 'P2002') {
            res.status(400).json({ success: false, message: 'A category with this name already exists' });
            return;
        }
        res.status(500).json({ success: false, message: 'Failed to create category' });
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, companyId } = req.body;
        if (!name) {
            res.status(400).json({ success: false, message: 'Name is required' });
            return;
        }
        const existing = await prisma_1.prisma.category.findUnique({ where: { id } });
        if (existing && existing.name.toLowerCase().includes('company fund')) {
            res.status(400).json({ success: false, message: 'Company Funds is a protected system category and cannot be modified.' });
            return;
        }
        const data = { name: name.trim() };
        if (type)
            data.type = type;
        if (companyId !== undefined)
            data.companyId = companyId ? companyId : null;
        const category = await prisma_1.prisma.category.update({
            where: { id },
            data
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.UPDATE,
            entity: 'CATEGORY',
            entityId: category.id,
            details: { newName: category.name, type: category.type },
            ipAddress: req.ip
        });
        res.json({ success: true, category });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update category' });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma_1.prisma.category.findUnique({
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
        if (category.name.toLowerCase().includes('company fund')) {
            res.status(400).json({ success: false, message: 'Company Funds is a protected system category and cannot be deleted.' });
            return;
        }
        if (category._count.transactions > 0) {
            res.status(400).json({
                success: false,
                message: `Cannot delete category because it is currently linked to ${category._count.transactions} transaction(s).`
            });
            return;
        }
        await prisma_1.prisma.category.delete({ where: { id } });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.DELETE,
            entity: 'CATEGORY',
            entityId: id,
            details: { deletedCategory: category.name },
            ipAddress: req.ip
        });
        res.json({ success: true, message: 'Category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
};
exports.deleteCategory = deleteCategory;
