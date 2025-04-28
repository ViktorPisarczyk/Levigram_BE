import { Post } from "../models/postModel.js";
import { Comment } from "../models/commentModel.js";
import { verifyToken } from "../middlewares/jwt.js";
import { User } from "../models/userModel.js";
import { cloudinary } from "../config/cloudinaryConfig.js";

// === Create Post ===
export const createPost = async (req, res, next) => {
  try {
    const { content, media } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "You must be logged in to post." });
    }

    const decoded_token = await verifyToken(token);
    const user = await User.findById(decoded_token.id);
    if (!user) return res.status(401).json({ message: "Invalid user." });

    const createdPost = await Post.create({
      author: user._id,
      content,
      media: Array.isArray(media) ? media : [],
    });

    const newPost = await Post.findById(createdPost._id).populate(
      "author",
      "username profilePicture"
    );

    res.status(201).json(newPost);
  } catch (error) {
    console.error("❌ Upload-Fehler:", error);
    res.status(500).json({ message: "Fehler beim Hochladen", error });
  }
};

// === Get All Posts ===
export const getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate("author", "username profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "username profilePicture",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const hasMore = totalPosts > skip + posts.length;

    res.status(200).json({
      posts,
      hasMore,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (error) {
    next(error);
  }
};

// === Get Single Post by ID ===
export const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username profilePicture")
      .populate({
        path: "comments",
        populate: { path: "user", select: "username profilePicture" },
      });

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

// === Update Post ===
export const updatePost = async (req, res, next) => {
  try {
    const { content, media } = req.body;
    const userId = req.user;

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: You can only update your own post." });
    }

    post.content = content || post.content;

    // ↓↓↓ Neue Medienspeicherung
    if (Array.isArray(media)) {
      post.media = media;
    }

    const updatedPost = await post.save();
    await updatedPost.populate("author", "username profilePicture");

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    next(error);
  }
};

// === Delete Post ===
export const deletePost = async (req, res, next) => {
  try {
    const userId = req.user;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: You can only delete your own post." });
    }

    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();

    res
      .status(200)
      .json({ message: "Post and its comments deleted successfully!" });
  } catch (error) {
    next(error);
  }
};

// === Like/Unlike Post ===
export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!req.user) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const userId = req.user.toString();
    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      post.likes = post.likes.filter((like) => like !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// === Add Comment ===
export const commentOnPost = async (req, res, next) => {
  try {
    const { text } = req.body;
    const userId = req.user;

    if (!text) {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const newComment = await Comment.create({
      user: userId,
      post: post._id,
      text,
    });

    post.comments.push(newComment._id);
    await post.save();

    await newComment.populate("user", "username profilePicture");

    res.status(201).json(newComment);
  } catch (error) {
    next(error);
  }
};

// === Get All Posts by Author ===
export const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const posts = await Post.find({ author: userId })
      .populate("author", "username profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "username profilePicture",
        },
      })
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error("Error fetching user posts:", error.message, error.stack);
    res.status(500).json({ message: "Error fetching user posts" });
  }
};

// === Search Posts ===
export const searchPosts = async (req, res) => {
  try {
    const query = req.query.query || "";

    const posts = await Post.find({
      content: { $regex: query, $options: "i" },
    }).populate("author", "username profilePicture");

    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Suche fehlgeschlagen" });
  }
};

// === Get Comments for a Post ===
export const getCommentsByPostId = async (req, res, next) => {
  try {
    const postId = req.params.id;

    const comments = await Comment.find({ post: postId })
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Error fetching comments" });
  }
};
