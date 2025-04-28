import { Comment } from "../models/commentModel.js";
import { Post } from "../models/postModel.js";
import { User } from "../models/userModel.js";
import { verifyToken } from "../middlewares/jwt.js";

export const createComment = async (req, res, next) => {
  try {
    const { text, post } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded_token = await verifyToken(token);
    const user = await User.findById(decoded_token.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newComment = new Comment({
      text,
      post,
      user: user._id,
    });

    await newComment.save();

    const updatedPost = await Post.findByIdAndUpdate(
      post,
      { $push: { comments: newComment._id } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(201).json(newComment);
  } catch (error) {
    next(error);
  }
};

export const getComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id).populate(
      "user",
      "username"
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.status(200).json(comment);
  } catch (error) {
    next(error);
  }
};

export const getAllComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.post }).populate(
      "user",
      "username"
    );

    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const userId = req.user;
    
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized: You can only update your own comments." });
    }

    comment.text = text || comment.text;
    await comment.save();
    
    // Populate user info for the response
    await comment.populate("user", "username profilePicture");

    res.status(200).json(comment);
  } catch (error) {
    console.error("Error updating comment:", error);
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user found" });
    }

    if (comment.user.toString() !== req.user && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await comment.deleteOne();
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id },
    });

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error in deleteComment:", error);
    next(error);
  }
};
