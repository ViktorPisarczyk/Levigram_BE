import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

import { userRouter } from "./routes/userRouter.js";
import { postRouter } from "./routes/postRouter.js";
import { commentRouter } from "./routes/commentRouter.js";
import { errorHandler, notFound } from "./middlewares/errors.js";

const app = express();

const allowedOrigins = ["placeholder", "http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        return callback(null, false);
      }
    },
    credentials: true,
  })
);

app.options("*", cors());

dotenv.config();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// API Routes
app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
