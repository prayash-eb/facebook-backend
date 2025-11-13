
import multer from "multer";
import type { Request } from "express";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

// Use memory storage to avoid saving files to disk
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    fileFilter: (req: Request, file, cb) => {
        const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg"];
        const allowedVideoTypes = ["video/mp4", "video/quicktime"];

        if ([...allowedImageTypes, ...allowedVideoTypes].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only images and videos are allowed."));
        }
    },
    limits: {
        // absolute max for any file (50MB)
        fileSize: MAX_VIDEO_SIZE,
    },
});

export { upload, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE };
