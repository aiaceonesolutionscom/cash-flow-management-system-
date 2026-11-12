"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Ensure binary engine mode
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';
// Restrict connection pool to prevent thread exhaustion on cPanel CloudLinux CageFS
let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && !dbUrl.includes('connection_limit')) {
    const separator = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${separator}connection_limit=3&pool_timeout=30&connect_timeout=30`;
    process.env.DATABASE_URL = dbUrl;
}
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
