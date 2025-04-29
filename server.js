import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import { userRouter } from "./routes/userRouter.js";
import { postRouter } from "./routes/postRouter.js";
import { commentRouter } from "./routes/commentRouter.js";
import { errorHandler, notFound } from "./middlewares/errors.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MongoDB Connection ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- Basic Middlewares ---
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// --- API Routes ---
app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);

// --- Static Frontend Files ---
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// --- Fallback für React-Routing ---
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// --- Error Handling ---
app.use(notFound);
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
