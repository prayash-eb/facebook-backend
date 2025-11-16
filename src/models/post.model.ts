import { Schema, Document, Types, model } from "mongoose";

interface IPostMedia {
    mediaType: string;
    url: string;
}

type Privacy = "onlyme" | "public" | "friends";

interface IRecentComment {
    commentId: Types.ObjectId;
    userId: Types.ObjectId;
    fullName: string;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPost extends Document {
    userId: Types.ObjectId;
    fullName: string;
    textContent?: string;
    userAvatar: string;
    media?: IPostMedia[];
    privacy: Privacy;
    tags?: Types.ObjectId[]
    reactionsCount: number;
    commentsCount: number;
    shareCount: number;
    isViral: boolean;
    postType: "post" | "story";
    recentComments: IRecentComment[];
    createdAt: Date;
    updatedAt: Date;
}

const recentCommentSchema = new Schema<IRecentComment>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    commentId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    _id: false
})

const postSchema = new Schema<IPost>({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true },
    userAvatar: { type: String },
    textContent: { type: String },
    media: [{
        mediaType: String,
        url: String
    }],
    privacy: {
        type: String, enum: ["onlyme", "friends", "public"],
        default: "friends"
    },
    tags: [
        { type: Schema.Types.ObjectId }
    ],
    reactionsCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    recentComments: [recentCommentSchema],
    isViral: { type: Boolean, default: false },
    postType: { type: String, enum: ["post", "story"] },
}, { timestamps: true });

postSchema.index({ userId: 1, createdAt: -1 }); // for user feed
postSchema.index({ type: 1, createdAt: -1 }); // for fetching outliers

export const Post = model<IPost>("Post", postSchema);
