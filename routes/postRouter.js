import { Router } from "express";
import {
  createPost,
  getPosts,
  getPostById,
  getPostsByUser,
  updatePost,
  deletePost,
  likePost,
  commentOnPost,
  searchPosts,
  getCommentsByPostId,
  getLikesByPostId,
} from "../controllers/postController.js";
import { protect } from "../middlewares/auth.js";

export const postRouter = Router();

postRouter.get("/search", protect, searchPosts);
postRouter.get("/user/:userId", protect, getPostsByUser);
postRouter.get("/:id", protect, getPostById);
postRouter.get("/:id/comments", protect, getCommentsByPostId);
postRouter.get("/:id/likes", protect, getLikesByPostId);
postRouter.get("/", protect, getPosts);

postRouter.post("/", protect, createPost);
postRouter.patch("/:id", protect, updatePost);
postRouter.delete("/:id", protect, deletePost);

postRouter.post("/:id/like", protect, likePost);
postRouter.post("/:id/comment", protect, commentOnPost);
