import { Post } from "../models/postModel.js";
import { Comment } from "../models/commentModel.js";
import { verifyToken } from "../middlewares/jwt.js";
import { User } from "../models/userModel.js";

// === Create Post ===
export const createPost = async (req, res, next) => {
  try {
    const { content, media } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader)
      return res.status(401).json({ message: "Authorization header missing." });
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token missing." });

    const decodedToken = await verifyToken(token);
    const user = await User.findById(decodedToken.id);
    if (!user) return res.status(401).json({ message: "Invalid user." });

    const formattedMedia = (media || []).map((m) => ({
      url: m.url,
      poster: m.poster || undefined,
    }));

    const createdPost = await Post.create({
      author: user._id,
      content,
      media: formattedMedia,
    });

    const populatedPost = await Post.findById(createdPost._id).populate(
      "author",
      "username profilePicture"
    );

    if (!populatedPost) {
      return res.status(500).json({ message: "Failed to populate post." });
    }

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("❌ Error creating post:", error);
    res.status(500).json({ message: "Failed to create post." });
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
        populate: { path: "user", select: "username profilePicture" },
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

// === Get Single Post ===
export const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username profilePicture")
      .populate({
        path: "comments",
        populate: { path: "user", select: "username profilePicture" },
      });

    if (!post) return res.status(404).json({ message: "Post not found." });

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

    if (!userId)
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID provided." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can only update your own posts." });
    }

    if (content) post.content = content;

    if (Array.isArray(media)) {
      post.media = media.map((m) => ({
        url: m.url,
        poster: m.poster || undefined,
      }));
    }

    const updatedPost = await post.save();
    const populatedPost = await Post.findById(updatedPost._id).populate(
      "author",
      "username profilePicture"
    );

    if (!populatedPost) {
      return res
        .status(500)
        .json({ message: "Failed to populate updated post." });
    }

    res.status(200).json(populatedPost);
  } catch (error) {
    console.error("❌ Error updating post:", error);
    res.status(500).json({ message: "Failed to update post." });
  }
};

// === Delete Post ===
export const deletePost = async (req, res, next) => {
  try {
    const userId = req.user;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can only delete your own post." });
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
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user?.toString();
    if (!userId) return res.status(400).json({ message: "Invalid user ID" });

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

// === Comment on Post ===
export const commentOnPost = async (req, res, next) => {
  try {
    const { text } = req.body;
    const userId = req.user;

    if (!text) {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

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

// === Get Comments for Post ===
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

// === Get Posts by User ===
export const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const posts = await Post.find({ author: userId })
      .populate("author", "username profilePicture")
      .populate({
        path: "comments",
        populate: { path: "user", select: "username profilePicture" },
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
    res.status(500).json({ message: "Search failed." });
  }
};
