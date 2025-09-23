import { Schema, model } from "mongoose";

const postSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  content: {
    type: String,
    required: false,
    trim: true,
    maxlength: 500,
  },
  media: [
    {
      url: { type: String, required: true },
      poster: { type: String, required: false },
    },
  ],
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

postSchema.index({ createdAt: 1 });
postSchema.index({ content: "text" });

export const Post = model("Post", postSchema);
