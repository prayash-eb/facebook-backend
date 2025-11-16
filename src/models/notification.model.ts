import { Schema, model, Types, Document } from "mongoose";

type NotificationType = "system" | "reaction" | "post" | "tags" | "friend_requests"

interface INotification extends Document {
    userId: Types.ObjectId;
    notificationType: NotificationType;
    notificationMessage: String;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    notificationType: {
        type: String,
        enum: ["system", "reaction", "post", "tags", "friend_requests"]
    },
    notificationMessage: {
        type: String
    }
}, {
    timestamps: true
})

export const Notification = model<INotification>("notifications", notificationSchema) 