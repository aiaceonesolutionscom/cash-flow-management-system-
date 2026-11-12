"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompanyNote = exports.updateCompanyNoteStatus = exports.updateCompanyNote = exports.createCompanyNote = exports.getCompanyNotesSummary = exports.getCompanyNotes = void 0;
const prisma_1 = require("../prisma");
const client_1 = require("@prisma/client");
const audit_1 = require("../utils/audit");
const getCompanyNotes = async (req, res) => {
    try {
        const { companyId, status, priority, search } = req.query;
        const where = {};
        if (companyId && companyId !== 'all') {
            where.companyId = companyId;
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (priority && priority !== 'all') {
            where.priority = priority;
        }
        if (search && typeof search === 'string' && search.trim() !== '') {
            const term = search.trim();
            where.OR = [
                { title: { contains: term, mode: 'insensitive' } },
                { notes: { contains: term, mode: 'insensitive' } },
                {
                    items: {
                        some: {
                            itemName: { contains: term, mode: 'insensitive' }
                        }
                    }
                }
            ];
        }
        const notes = await prisma_1.prisma.companyNote.findMany({
            where,
            include: {
                company: {
                    select: { id: true, name: true, code: true }
                },
                items: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: [
                { status: 'asc' }, // PENDING first
                { dueDate: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.json({ success: true, notes });
    }
    catch (error) {
        console.error('Error fetching company notes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch company notes', error: error.message });
    }
};
exports.getCompanyNotes = getCompanyNotes;
const getCompanyNotesSummary = async (req, res) => {
    try {
        const { companyId } = req.query;
        // Fetch all active companies
        const companies = await prisma_1.prisma.company.findMany({
            select: { id: true, name: true, code: true }
        });
        // We calculate summaries for PENDING and IN_PROGRESS (unfulfilled requirements)
        const activeFilter = {
            status: { in: [client_1.DemandStatus.PENDING, client_1.DemandStatus.IN_PROGRESS] }
        };
        if (companyId && companyId !== 'all') {
            activeFilter.companyId = companyId;
        }
        const activeNotes = await prisma_1.prisma.companyNote.findMany({
            where: activeFilter,
            select: {
                id: true,
                companyId: true,
                totalAmount: true,
                status: true
            }
        });
        let grandTotalPending = 0;
        const companyTotalsMap = new Map();
        companies.forEach((c) => {
            companyTotalsMap.set(c.id, 0);
        });
        activeNotes.forEach((n) => {
            const amt = Number(n.totalAmount) || 0;
            grandTotalPending += amt;
            const prev = companyTotalsMap.get(n.companyId) || 0;
            companyTotalsMap.set(n.companyId, prev + amt);
        });
        const companyBreakdowns = companies.map((c) => ({
            companyId: c.id,
            companyName: c.name,
            companyCode: c.code,
            pendingTotal: companyTotalsMap.get(c.id) || 0
        }));
        // Status counts
        const statusCountsRaw = await prisma_1.prisma.companyNote.groupBy({
            by: ['status'],
            _count: { id: true },
            _sum: { totalAmount: true }
        });
        const counts = {
            PENDING: { count: 0, total: 0 },
            IN_PROGRESS: { count: 0, total: 0 },
            FULFILLED: { count: 0, total: 0 },
            CANCELLED: { count: 0, total: 0 }
        };
        statusCountsRaw.forEach((sc) => {
            counts[sc.status] = {
                count: sc._count.id,
                total: Number(sc._sum.totalAmount) || 0
            };
        });
        res.json({
            success: true,
            summary: {
                grandTotalPending,
                companyBreakdowns,
                counts
            }
        });
    }
    catch (error) {
        console.error('Error fetching company notes summary:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch summary', error: error.message });
    }
};
exports.getCompanyNotesSummary = getCompanyNotesSummary;
const createCompanyNote = async (req, res) => {
    try {
        const { companyId, title, items, dueDate, priority, notes } = req.body;
        if (!companyId || !title || !items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ success: false, message: 'Company, title, and at least one line item are required' });
            return;
        }
        // Verify company
        const company = await prisma_1.prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            res.status(404).json({ success: false, message: 'Company not found' });
            return;
        }
        // Calculate total amount from line items
        let total = 0;
        const validatedItems = [];
        for (const it of items) {
            const name = (it.itemName || '').trim();
            const amt = parseFloat(it.amount);
            if (!name || isNaN(amt) || amt <= 0) {
                res.status(400).json({ success: false, message: 'All items must have a valid item description and positive amount' });
                return;
            }
            total += amt;
            validatedItems.push({ itemName: name, amount: amt });
        }
        const note = await prisma_1.prisma.$transaction(async (tx) => {
            const createdNote = await tx.companyNote.create({
                data: {
                    companyId,
                    title: title.trim(),
                    totalAmount: total,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    priority: priority || client_1.DemandPriority.HIGH,
                    status: client_1.DemandStatus.PENDING,
                    notes: notes ? notes.trim() : null,
                    items: {
                        create: validatedItems.map((vi) => ({
                            itemName: vi.itemName,
                            amount: vi.amount
                        }))
                    }
                },
                include: {
                    company: { select: { id: true, name: true, code: true } },
                    items: true
                }
            });
            return createdNote;
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.CREATE,
            entity: 'CompanyNote',
            entityId: note.id,
            details: {
                companyId,
                companyName: company.name,
                title: note.title,
                totalAmount: total,
                itemCount: validatedItems.length
            },
            ipAddress: req.ip
        });
        res.status(201).json({ success: true, message: 'Note created successfully', note });
    }
    catch (error) {
        console.error('Error creating company note:', error);
        res.status(500).json({ success: false, message: 'Failed to create note', error: error.message });
    }
};
exports.createCompanyNote = createCompanyNote;
const updateCompanyNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, title, items, dueDate, priority, status, notes } = req.body;
        const existing = await prisma_1.prisma.companyNote.findUnique({
            where: { id },
            include: { items: true, company: true }
        });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Note not found' });
            return;
        }
        const updatedNote = await prisma_1.prisma.$transaction(async (tx) => {
            let totalAmount = existing.totalAmount;
            if (items && Array.isArray(items)) {
                if (items.length === 0) {
                    throw new Error('At least one item is required');
                }
                let calculatedTotal = 0;
                const validatedItems = [];
                for (const it of items) {
                    const name = (it.itemName || '').trim();
                    const amt = parseFloat(it.amount);
                    if (!name || isNaN(amt) || amt <= 0) {
                        throw new Error('All items must have a valid name and positive amount');
                    }
                    calculatedTotal += amt;
                    validatedItems.push({ itemName: name, amount: amt });
                }
                // Delete old items and insert new ones
                await tx.companyNoteItem.deleteMany({ where: { noteId: id } });
                await tx.companyNoteItem.createMany({
                    data: validatedItems.map((vi) => ({
                        noteId: id,
                        itemName: vi.itemName,
                        amount: vi.amount
                    }))
                });
                totalAmount = new client_1.Prisma.Decimal(calculatedTotal);
            }
            return tx.companyNote.update({
                where: { id },
                data: {
                    companyId: companyId || existing.companyId,
                    title: title ? title.trim() : existing.title,
                    totalAmount,
                    dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
                    priority: priority ? priority : existing.priority,
                    status: status ? status : existing.status,
                    notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes
                },
                include: {
                    company: { select: { id: true, name: true, code: true } },
                    items: true
                }
            });
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.UPDATE,
            entity: 'CompanyNote',
            entityId: id,
            details: {
                title: updatedNote.title,
                totalAmount: Number(updatedNote.totalAmount),
                status: updatedNote.status
            },
            ipAddress: req.ip
        });
        res.json({ success: true, message: 'Note updated successfully', note: updatedNote });
    }
    catch (error) {
        console.error('Error updating company note:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update note' });
    }
};
exports.updateCompanyNote = updateCompanyNote;
const updateCompanyNoteStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !Object.values(client_1.DemandStatus).includes(status)) {
            res.status(400).json({ success: false, message: 'Valid status is required' });
            return;
        }
        const note = await prisma_1.prisma.companyNote.update({
            where: { id },
            data: { status },
            include: {
                company: { select: { id: true, name: true, code: true } },
                items: true
            }
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.UPDATE,
            entity: 'CompanyNote',
            entityId: id,
            details: {
                statusChangedTo: status,
                title: note.title
            },
            ipAddress: req.ip
        });
        res.json({ success: true, message: `Status updated to ${status}`, note });
    }
    catch (error) {
        console.error('Error updating note status:', error);
        res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
    }
};
exports.updateCompanyNoteStatus = updateCompanyNoteStatus;
const deleteCompanyNote = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.companyNote.findUnique({
            where: { id },
            include: { company: true }
        });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Note not found' });
            return;
        }
        await prisma_1.prisma.companyNote.delete({ where: { id } });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.DELETE,
            entity: 'CompanyNote',
            entityId: id,
            details: {
                title: existing.title,
                companyName: existing.company.name,
                totalAmount: Number(existing.totalAmount)
            },
            ipAddress: req.ip
        });
        res.json({ success: true, message: 'Note deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting company note:', error);
        res.status(500).json({ success: false, message: 'Failed to delete note', error: error.message });
    }
};
exports.deleteCompanyNote = deleteCompanyNote;
