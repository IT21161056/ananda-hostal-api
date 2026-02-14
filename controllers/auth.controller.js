import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import {
  createAccessToken,
  createRefreshToken,
} from "../utils/generateToken.js";

// Cookie configuration helper
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
});

// @desc Login
// @route POST /auth/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { password, email } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const foundUser = await User.findOne({ email }).exec();

  if (!foundUser) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await foundUser.matchPassword(password);

  if (!isPasswordValid) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (foundUser.isActive === false) {
    res.status(403);
    throw new Error("Account is deactivated. Please contact an administrator.");
  }

  const accessToken = createAccessToken(
    foundUser,
    process.env.ACCESS_TOKEN_SECRET,
  );

  const refreshToken = createRefreshToken(
    foundUser,
    process.env.REFRESH_TOKEN_SECRET,
  );

  // Create secure cookie with refresh token
  res.cookie("refreshToken", refreshToken, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const userResponse = {
    id: foundUser._id,
    firstName: foundUser.firstName,
    lastName: foundUser.lastName,
    email: foundUser.email,
    nic: foundUser.nic,
    phone: foundUser.phone,
    role: foundUser.role,
    createdAt: foundUser.createdAt,
    updatedAt: foundUser.updatedAt,
  };

  res.json({
    success: true,
    user: userResponse,
    accessToken,
  });
});

// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token required",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const foundUser = await User.findById(decoded.id).exec();

    if (!foundUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (foundUser.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact an administrator.",
      });
    }

    const newAccessToken = createAccessToken(
      foundUser,
      process.env.ACCESS_TOKEN_SECRET,
    );

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    // Clear the invalid refresh token cookie
    res.clearCookie("refreshToken", getCookieOptions());

    return res.status(403).json({
      success: false,
      message: "Invalid or expired refresh token",
      error: "refresh_token_invalid",
    });
  }
});

// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = asyncHandler(async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.refreshToken) {
    return res.status(200).json({
      success: true,
      message: "No refresh token found",
    });
  }

  res.clearCookie("refreshToken", getCookieOptions());

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export { login, refresh, logout };
