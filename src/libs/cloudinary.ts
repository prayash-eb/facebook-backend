
import { Readable } from "stream";
// import cloudinary from "../configs/cloudinary.js";

import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

config()

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;

cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_secret: API_SECRET,
    api_key: API_KEY,
    secure: true,
});

export const uploadToCloudinary = async (file: Express.Multer.File, folder: string) => {
    const fileStream = Readable.from(file.buffer)
    return await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "auto" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        fileStream.pipe(uploadStream)
    })
};