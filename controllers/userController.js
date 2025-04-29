import { createToken } from "../middlewares/jwt.js";
import { User } from "../models/userModel.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Lax",
  maxAge: 1000 * 60 * 60 * 24 * 365,
};

// === SIGNUP ===
export const signup = async (req, res, next) => {
  try {
    const { username, email, password, inviteCode } = req.body;

    if (inviteCode !== process.env.REGISTER_CODE) {
      return res.status(403).json({ message: "Invalid invitation code." });
    }

    const newUser = await User.create({ username, email, password });

    const token = await createToken({
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      profilePicture: newUser.profilePicture || "",
    });

    res
      .cookie("access_token", token, cookieOptions)
      .status(201)
      .json({ message: "Signup successful!", user: newUser });
  } catch (error) {
    next(error);
  }
};

// === LOGIN ===
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found." });
    }

    const matchedPWD = await user.auth(password);
    if (!matchedPWD) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    const token = await createToken({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture || "",
    });

    res
      .cookie("access_token", token, cookieOptions)
      .status(200)
      .json({ message: "Login successful!", user });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

// === LOGOUT ===
export const logout = (req, res) => {
  try {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    });
    res.status(200).json({ message: "Logout successful!" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed." });
  }
};

// === GET ALL USERS ===
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// === GET SINGLE USER ===
export const getSingleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// === UPDATE USER ===
export const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id || req.user;
    const { username, profilePicture } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (username) user.username = username;
    if (profilePicture) user.profilePicture = profilePicture;

    const updatedUser = await user.save();

    res.status(200).json({ message: "Profile updated.", user: updatedUser });
  } catch (error) {
    console.error("Update User error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
};

// === DELETE USER ===
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    const remainingUsers = await User.find();
    res.json({ remainingUsers, deletedUser: user });
  } catch (error) {
    next(error);
  }
};

// === GET LOGGED IN USER ===
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// === RESET PASSWORD ===
export const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Email not found." });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
};
