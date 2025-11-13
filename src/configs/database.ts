import mongoose from "mongoose";

export default async function connectDB() {
    try {
        const DB_URL = process.env.DATABASE_URL_REMOTE!;
        if (!DB_URL) {
            console.log("Please configure database URL");
            process.exit(1)
        }
        mongoose.connection.on("connected", () => {
            console.log("Database Connected");
        })
        mongoose.connect(DB_URL,{
            dbName:"facebook"
        })
    } catch (error) {
        console.log("Error while connecting to database", error);
        process.exit(1)
    }
}