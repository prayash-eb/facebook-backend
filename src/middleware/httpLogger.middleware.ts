import morgan from 'morgan';
import { stream } from '../utils/logger.js';

// Custom token to get user ID from request
morgan.token('user-id', (req: any) => {
    return req.user?.id?.toString() || 'anonymous';
});

// Custom token to get real IP (considering proxies)
morgan.token('real-ip', (req: any) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
});

// Development format - detailed and colorful
const developmentFormat = ':method :url :status :response-time ms - :res[content-length] - User: :user-id - IP: :real-ip';

// Production format - JSON format for log aggregation
const productionFormat = JSON.stringify({
    method: ':method',
    url: ':url',
    status: ':status',
    responseTime: ':response-time',
    contentLength: ':res[content-length]',
    userId: ':user-id',
    ip: ':real-ip',
    userAgent: ':user-agent',
    referrer: ':referrer',
});

// Skip logging for health check endpoints
const skip = (req: any) => {
    return req.url === '/health' || req.url === '/ping';
};

// Create Morgan middleware
const isDevelopment = process.env.NODE_ENV !== 'production';

export const httpLogger = morgan(
    isDevelopment ? developmentFormat : productionFormat,
    {
        stream,
        skip,
    }
);
