import { Comment } from "../models/commentModel.js";
import { Post } from "../models/postModel.js";
import { User } from "../models/userModel.js";

// === CREATE COMMENT ===
export const createComment = async (req, res, next) => {
  try {
    const { text, post } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user found." });
    }

    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const newComment = new Comment({
      text,
      post,
      user: user._id,
    });

    await newComment.save();

    await Post.findByIdAndUpdate(post, {
      $push: { comments: newComment._id },
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    next(error);
  }
};

// === GET SINGLE COMMENT ===
export const getComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id).populate(
      "user",
      "username profilePicture"
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    res.status(200).json(comment);
  } catch (error) {
    next(error);
  }
};

// === GET ALL COMMENTS FOR POST ===
export const getAllComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.post })
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

// === UPDATE COMMENT ===
export const updateComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const userId = req.user;

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (comment.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can only update your own comments." });
    }

    comment.text = text || comment.text;
    await comment.save();

    await comment.populate("user", "username profilePicture");

    res.status(200).json(comment);
  } catch (error) {
    console.error("Error updating comment:", error);
    next(error);
  }
};

// === DELETE COMMENT ===
export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user found." });
    }

    if (comment.user.toString() !== req.user) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Cannot delete this comment." });
    }

    await comment.deleteOne();
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id },
    });

    res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Error deleting comment:", error);
    next(error);
  }
};
