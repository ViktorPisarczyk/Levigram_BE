import { Router } from "express";
import {
  deleteUser,
  getSingleUser,
  getUsers,
  login,
  logout,
  signup,
  updateUser,
  getMe,
  resetPassword,
} from "../controllers/userController.js";
import { protect } from "../middlewares/auth.js";

export const userRouter = Router();

userRouter.route("/signup").post(signup);
userRouter.route("/login").post(login);
userRouter.route("/logout").post(logout);
userRouter.route("/").get(protect, getUsers);
userRouter.route("/me").get(protect, getMe);
userRouter.route("/reset-password").post(resetPassword);
userRouter
  .route("/:id")
  .get(protect, getSingleUser)
  .patch(protect, updateUser)
  .delete(protect, deleteUser);
