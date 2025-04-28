import { Router } from "express";
import {
  createComment,
  getComment,
  getAllComments,
  updateComment,
  deleteComment,
} from "../controllers/commentController.js";
import { protect } from "../middlewares/auth.js";

export const commentRouter = Router();

commentRouter.route("/").post(protect, createComment);
commentRouter
  .route("/:id")
  .get(getComment)
  .patch(protect, updateComment)
  .delete(protect, deleteComment);
commentRouter.route("/post/:postId").get(protect, getAllComments);