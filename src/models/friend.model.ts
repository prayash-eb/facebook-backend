import { Schema, model, Types, Document } from "mongoose";

interface IFriend extends Document {
    userId: Types.ObjectId;
    friendId: Types.ObjectId;
    isFollowing: boolean
}

const friendSchema = new Schema<IFriend>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    friendId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    isFollowing: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})

export const Friend = model<IFriend>("friends", friendSchema) 