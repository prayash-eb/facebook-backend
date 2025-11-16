import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Determine the environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
    )
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Define transports
const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
        format: consoleFormat,
        level: isDevelopment ? 'debug' : 'info',
    }),
];

// Add file transports in production or if explicitly enabled
if (!isDevelopment || process.env.ENABLE_FILE_LOGGING === 'true') {
    // Error logs - daily rotation
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d', // Keep logs for 30 days
            maxSize: '20m', // Max file size 20MB
            format: logFormat,
        })
    );

    // Combined logs - daily rotation
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            maxSize: '20m',
            format: logFormat,
        })
    );

    // HTTP logs - daily rotation (for request/response logging)
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'http-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'http',
            maxFiles: '14d', // Keep HTTP logs for 14 days
            maxSize: '20m',
            format: logFormat,
        })
    );
}

// Create the logger instance
const logger = winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    levels,
    format: logFormat,
    transports,
    exitOnError: false,
});

// Stream for Morgan HTTP logger integration
export const stream = {
    write: (message: string) => {
        logger.http(message.trim());
    },
};

// Helper functions for common logging patterns
export const logInfo = (message: string, meta?: any) => {
    logger.info(message, meta);
};

export const logError = (message: string, error?: any, meta?: any) => {
    logger.error(message, { error: error?.message || error, stack: error?.stack, ...meta });
};

export const logWarn = (message: string, meta?: any) => {
    logger.warn(message, meta);
};

// Log controller actions
export const logControllerAction = (
    controller: string,
    action: string,
    userId?: string,
    meta?: any
) => {
    logger.info(`[${controller}] ${action}`, { userId, ...meta });
};

// Log authentication events
export const logAuthEvent = (
    event: 'login' | 'logout' | 'register' | 'password_change' | 'token_refresh',
    userId?: string,
    success: boolean = true,
    meta?: any
) => {
    const message = `[AUTH] ${event} - ${success ? 'Success' : 'Failed'}`;
    if (success) {
        logger.info(message, { userId, ...meta });
    } else {
        logger.warn(message, { userId, ...meta });
    }
};

// Log validation errors
export const logValidationError = (
    field: string,
    value: any,
    reason: string,
    meta?: any
) => {
    logger.warn(`[VALIDATION] Field '${field}' validation failed: ${reason}`, {
        field,
        value,
        reason,
        ...meta,
    });
};

// Log service operations
export const logServiceOperation = (
    service: string,
    operation: string,
    meta?: any
) => {
    logger.debug(`[Service:${service}] ${operation}`, meta);
};

// Log cache operations
export const logCacheOperation = (
    operation: 'hit' | 'miss' | 'set' | 'invalidate',
    key: string,
    meta?: any
) => {
    logger.debug(`[CACHE] ${operation.toUpperCase()} - ${key}`, meta);
};

export default logger;
