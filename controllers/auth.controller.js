import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import {
  createAccessToken,
  createRefreshToken,
} from "../utils/generateToken.js";

// @desc Login
// @route POST /auth
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

  const accessToken = createAccessToken(
    foundUser,
    process.env.ACCESS_TOKEN_SECRET
  );

  const refreshToken = createRefreshToken(
    foundUser,
    process.env.REFRESH_TOKEN_SECRET
  );

  // Create secure cookie with refresh token
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000,
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

  res.json({ user: userResponse, accessToken });
});

// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401);
    throw new Error("Refresh token required");
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const foundUser = await User.findById(decoded.id).exec();

    if (!foundUser) {
      res.status(404);
      throw new Error("User not found");
    }

    const newAccessToken = createAccessToken(
      foundUser,
      process.env.ACCESS_TOKEN_SECRET
    );

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(403);
    throw new Error("Invalid refresh token");
  }
});

// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = asyncHandler(async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.refreshToken) {
    return res.status(204).json({
      success: true,
      message: "No content",
    });
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export { login, refresh, logout };
