import { config } from "dotenv";
config();

import app from "./app.js";
import connectDB from "./configs/database.js";
import { logInfo, logError } from "./utils/logger.js";

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || "http://localhost"

app.listen(PORT, async () => {
    try {
        await connectDB();
        logInfo(`🚀 Server is running at ${BASE_URL}:${PORT}`, {
            environment: process.env.NODE_ENV || 'development',
            port: PORT,
            nodeVersion: process.version
        });
        logInfo(`✅ Database connected successfully`);
    } catch (error) {
        logError('Failed to start server', error);
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logError('Uncaught Exception', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
    logError('Unhandled Rejection', reason);
    process.exit(1);
});