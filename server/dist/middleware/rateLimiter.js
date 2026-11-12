"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalApiRateLimiter = exports.passwordChangeRateLimiter = exports.loginRateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const memoryStore = new Map();
// Cleanup stale records periodically every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
        if (now > record.resetTime) {
            memoryStore.delete(key);
        }
    }
}, 5 * 60 * 1000);
function createRateLimiter(options) {
    const { windowMs, max, message } = options;
    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `${req.baseUrl || req.path}:${ip}`;
        const now = Date.now();
        const record = memoryStore.get(key);
        if (!record || now > record.resetTime) {
            memoryStore.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', max - 1);
            next();
            return;
        }
        if (record.count >= max) {
            const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfterSeconds);
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.status(429).json({
                success: false,
                message,
                retryAfterSeconds
            });
            return;
        }
        record.count += 1;
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', max - record.count);
        next();
    };
}
// 1. Strict Login Brute-Force Rate Limiter (Max 5 attempts per 15 mins)
exports.loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.'
});
// 2. Sensitive Password Change Limiter (Max 5 attempts per hour)
exports.passwordChangeRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many password update requests. Please wait an hour before trying again.'
});
// 3. General API Protection Limiter (Max 300 requests per minute)
exports.generalApiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    message: 'Too many requests. Please slow down.'
});
