import mongoose from "mongoose";
import { logInfo, logError, logWarn } from "../utils/logger.js";

export default async function connectDB() {
    try {
        const DB_URL = process.env.DATABASE_URL_REMOTE!;
        if (!DB_URL) {
            logError("Database URL not configured", new Error("Missing DATABASE_URL_REMOTE"));
            process.exit(1)
        }

        mongoose.connection.on("connected", () => {
            logInfo("✅ MongoDB connected successfully", {
                host: mongoose.connection.host,
                name: mongoose.connection.name
            });
        });

        mongoose.connection.on("error", (err) => {
            logError("MongoDB connection error", err);
        });

        mongoose.connection.on("disconnected", () => {
            logWarn("MongoDB disconnected");
        });

        await mongoose.connect(DB_URL, {
            dbName: "facebook"
        });
    } catch (error) {
        logError("Failed to connect to database", error);
        process.exit(1)
    }
}