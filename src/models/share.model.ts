import { Schema, model, Types, Document } from "mongoose";

interface IShare extends Document {
    userId: Types.ObjectId;
    postId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const shareSchema = new Schema<IShare>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    postId: {
        type: Schema.Types.ObjectId,
        required: true
    }
}, {
    timestamps: true
})

export const Share = model<IShare>("shares", shareSchema) 