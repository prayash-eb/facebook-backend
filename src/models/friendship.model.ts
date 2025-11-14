import { Schema, model, Types, Document } from "mongoose";
interface IFriendship extends Document {
    userIds: Types.ObjectId[]; // Always length 2
    status: "pending" | "accepted";
    actionUser: Types.ObjectId; // Who sent the request
}

const friendshipSchema = new Schema<IFriendship>({
    userIds: {
        type: [Schema.Types.ObjectId],
        ref: "user",
        required: true,
        validate: (v: any[]) => v.length === 2,
    },
    status: {
        type: String,
        enum: ["pending", "accepted"],
        default: "pending"
    },
    actionUser: { type: Schema.Types.ObjectId } // sender
}, { timestamps: true });

friendshipSchema.index({ userIds: 1 }, { unique: true });

export const Friendship = model<IFriendship>("friendships", friendshipSchema);
