import { verifyToken } from "./jwt.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.access_token;

    if (!token) {
      console.error("No token provided");
      return res.status(401).json({ message: "No token provided" });
    }

    const decodedToken = await verifyToken(token);

    if (!decodedToken || !decodedToken.id) {
      console.error("Invalid token or missing user ID");
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decodedToken.id;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res
      .status(401)
      .json({ message: "Unauthorized", error: error.message });
  }
};
