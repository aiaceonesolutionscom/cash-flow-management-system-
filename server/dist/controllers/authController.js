"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateProfile = exports.getMe = exports.logout = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const audit_1 = require("../utils/audit");
const client_1 = require("@prisma/client");
const JWT_SECRET = process.env.JWT_SECRET || 'cashflow_super_secure_jwt_secret_key_pk_2026_finance';
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required' });
            return;
        }
        const admin = await prisma_1.prisma.admin.findUnique({
            where: { email: email.toLowerCase().trim() }
        });
        if (!admin) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, admin.passwordHash);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '7d' });
        // Set HTTP-only secure session cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.CREATE,
            entity: 'AUTH',
            entityId: admin.id,
            details: { message: 'Admin logged in successfully', email: admin.email },
            ipAddress: req.ip
        });
        res.json({
            success: true,
            message: 'Login successful',
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during login' });
    }
};
exports.login = login;
const logout = async (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
};
exports.logout = logout;
const getMe = async (req, res) => {
    try {
        if (!req.admin?.id) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }
        const admin = await prisma_1.prisma.admin.findUnique({
            where: { id: req.admin.id },
            select: { id: true, email: true, name: true, createdAt: true }
        });
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }
        res.json({ success: true, admin });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admin profile' });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        if (!req.admin?.id) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }
        const { name } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ success: false, message: 'Name is required' });
            return;
        }
        const updated = await prisma_1.prisma.admin.update({
            where: { id: req.admin.id },
            data: { name: name.trim() },
            select: { id: true, email: true, name: true, createdAt: true }
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.UPDATE,
            entity: 'ADMIN_PROFILE',
            entityId: updated.id,
            details: { message: 'Admin profile name updated', name: updated.name },
            ipAddress: req.ip
        });
        res.json({ success: true, message: 'Profile updated successfully', admin: updated });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        if (!req.admin?.id) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!currentPassword || !newPassword || !confirmPassword) {
            res.status(400).json({ success: false, message: 'All password fields are required' });
            return;
        }
        if (newPassword !== confirmPassword) {
            res.status(400).json({ success: false, message: 'New password and confirmation do not match' });
            return;
        }
        // Strong password validation rules
        const hasMinLength = newPassword.length >= 8;
        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
        if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
            res.status(400).json({
                success: false,
                message: 'Weak password rejected. Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.'
            });
            return;
        }
        const admin = await prisma_1.prisma.admin.findUnique({
            where: { id: req.admin.id }
        });
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, admin.passwordHash);
        if (!isMatch) {
            res.status(400).json({ success: false, message: 'Current password is incorrect' });
            return;
        }
        const newHash = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.prisma.admin.update({
            where: { id: admin.id },
            data: { passwordHash: newHash }
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.UPDATE,
            entity: 'ADMIN_SECURITY',
            entityId: admin.id,
            details: { message: 'Admin password successfully changed' },
            ipAddress: req.ip
        });
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
};
exports.changePassword = changePassword;
