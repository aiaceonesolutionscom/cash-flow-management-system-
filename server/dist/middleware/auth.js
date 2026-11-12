"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'cashflow_super_secure_jwt_secret_key_pk_2026_finance';
function requireAdmin(req, res, next) {
    try {
        let token = req.cookies?.token;
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Support query parameter token for direct media preview & PDF viewing
        if (!token && typeof req.query.token === 'string' && req.query.token.trim()) {
            token = req.query.token.trim();
        }
        if (!token) {
            res.status(401).json({ success: false, message: 'Authentication required. No session found.' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
    }
}
