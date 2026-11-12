"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const routes_1 = __importDefault(require("./routes"));
const createApp = () => {
    const app = (0, express_1.default)();
    // Hide technology fingerprinting
    app.disable('x-powered-by');
    // OWASP ASVS V3 & V13 Security Headers
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: false, // Allows bundled SPA assets and styles
        frameguard: { action: "deny" },
        noSniff: true,
        xssFilter: true,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    app.use((0, cors_1.default)({
        origin: [clientUrl, 'http://localhost:3000', 'http://127.0.0.1:5173'],
        credentials: true,
    }));
    app.use((0, cookie_parser_1.default)());
    // Prevent DoS via oversized payload
    app.use(express_1.default.json({ limit: '2mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '2mb' }));
    // Mount API Routes
    app.use('/api', routes_1.default);
    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // Serve Frontend Single-Page App (SPA) in Production / cPanel
    const clientDistPaths = [
        path_1.default.resolve(__dirname, '../../client/dist'),
        path_1.default.resolve(process.cwd(), 'client/dist'),
        path_1.default.resolve(__dirname, '../client/dist'),
    ];
    const staticPath = clientDistPaths.find((p) => fs_1.default.existsSync(p));
    if (staticPath) {
        app.use(express_1.default.static(staticPath));
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
                return next();
            }
            res.sendFile(path_1.default.join(staticPath, 'index.html'));
        });
    }
    // Global Error Handler
    app.use((err, _req, res, _next) => {
        console.error('Unhandled Application Error:', err);
        res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal server error'
        });
    });
    return app;
};
exports.createApp = createApp;
