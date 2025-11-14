import express, { type Application, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.routes.js";
import postRouter from "./routes/post.routes.js";
import outlierThresholdRouter from "./routes/outer-threshold.route.js";

const app: Application = express();

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: false }));

app.use("/api/v1/user", authRouter)
app.use("/api/v1/post", postRouter)
app.use("/api/v1/threshold", outlierThresholdRouter)


app.get("/", (req: Request, res: Response) => {
    return res.status(200).json({
        status: "OK",
        message: "Server is up",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.use((req: Request, res: Response) => {
    return res.status(400).json({ message: "Route doesnot exist" });
});

app.use(errorHandler);

export default app;