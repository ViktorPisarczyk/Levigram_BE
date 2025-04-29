import { verifyToken } from "./jwt.js";

export const protect = async (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
    const decoded = await verifyToken(token);

    if (!decoded?.id) {
      return res.status(401).json({ message: "Invalid token." });
    }

    req.user = decoded.id;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    res
      .status(401)
      .json({ message: "Unauthorized: Invalid token.", error: error.message });
  }
};
