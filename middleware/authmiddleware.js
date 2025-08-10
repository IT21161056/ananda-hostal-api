import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";

/**
 * Middleware to protect routes - verifies token and loads user data
 */
const protect = asyncHandler(async (req, res, next) => {
  let token = "";

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // checks token expiration time

    const user = await User.findById(decoded.user.id).select("-password");

    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message); // Log the specific error

    let message = "Not authorized, token failed";
    if (error.name === "TokenExpiredError") {
      message = "Not authorized, token expired";
    } else if (error.name === "JsonWebTokenError") {
      message = "Not authorized, invalid token";
    }

    res.status(401).json({
      success: false,
      message: message,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Middleware to authorize users based on role
 * @param {...String} roles - Roles allowed to access the route
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("User not authenticated");
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role (${req.user.role}) is not authorized to access this resource`
      );
    }

    next();
  };
};

export { protect, authorizeRoles };
