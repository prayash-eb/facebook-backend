import { Schema, Document, Types, model } from "mongoose";

interface IBucketComment {
    userId: Types.ObjectId;
    fullName: string;
    textContent: string;
    media: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface IOutlierComment extends Document {
    postId: Types.ObjectId;
    bucketId: string;
    isFull: boolean;
    count: number;
    comments: IBucketComment[];
    createdAt: Date;
    updatedAt: Date
}

const bucketCommentSchema = new Schema<IBucketComment>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    fullName: {
        type: String,
        required: true,
    },
    textContent: {
        type: String,
    },
    media: {
        type: String,
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

const outlierCommentSchema = new Schema<IOutlierComment>({
    postId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    bucketId: {
        type: String,
        required: true
    },
    comments: [bucketCommentSchema],
    isFull: {
        type: Boolean,
        default: false
    },
    count: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
})

export const OutlierComment = model<IOutlierComment>("outlier_comments", outlierCommentSchema)