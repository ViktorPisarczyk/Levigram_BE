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

// --- CORS Config ---
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5001",
  "https://levigram-mono.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, origin);
      } else {
        console.log("Blocked by CORS:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// --- Middlewares ---
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- API Routes ---
app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);

// --- Serve Frontend ---
const frontendPath = path.join(__dirname, "dist");
app.use(express.static(frontendPath));

// --- For any non-API routes, serve index.html ---
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// --- Error Handling ---
app.use(notFound);
app.use(errorHandler);

// --- MongoDB Connection ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- Start Server ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
