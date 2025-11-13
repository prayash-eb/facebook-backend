import bcrypt from "bcryptjs";
import { Schema, model, Types, Document } from "mongoose";

export interface IUser extends Document {
    fullName: string;
    email: string;
    password: string;
    phoneNo?: string;
    profilePic?: string;
    coverPic?: string;
    bio?: string;
    followersCount: Number;
    followingsCount: Number;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNo: { type: String },
    profilePic: String,
    coverPic: String,
    bio: String,
    followersCount: { type: Number, default: 0 },
    followingsCount: { type: Number, default: 0 }

}, {
    timestamps: true, toJSON: {
        transform: function (doc: IUser, ret: any) {
            delete ret.password;
            delete ret.__v;
        },
    },
});


userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});



export const User = model<IUser>("User", userSchema);
