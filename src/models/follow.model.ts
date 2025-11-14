import { Schema, Document, model, Types } from "mongoose";

interface IFollow extends Document {
    followerId: Types.ObjectId; // A follows B
    targetId: Types.ObjectId;   // B
}

const followSchema = new Schema<IFollow>({
    followerId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "user"
    },
    targetId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "user"
    }
}, { timestamps: true });

followSchema.index({ followerId: 1, targetId: 1 }, { unique: true });

export const Follow = model<IFollow>("follows", followSchema);
