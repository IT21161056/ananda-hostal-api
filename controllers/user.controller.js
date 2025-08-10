import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";

/**
 * @desc    Create a new user
 * @route   POST /api/users
 * @access  Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, nic, phone, password, role } = req.body;

  if (!firstName || !lastName || !email || !nic || !phone || !password) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const validRoles = ["admin", "warden", "accountant", "kitchen"];
  if (role && !validRoles.includes(role)) {
    res.status(400);
    throw new Error("Invalid role provided");
  }

  const emailExists = await User.findOne({ email });
  if (emailExists) {
    res.status(400);
    throw new Error("Email already exists");
  }

  const nicExists = await User.findOne({ nic });
  if (nicExists) {
    res.status(400);
    throw new Error("NIC already exists");
  }

  const userObject = {
    firstName,
    lastName,
    email,
    nic,
    phone,
    password,
    role: role || "student",
  };

  const user = await User.create(userObject);

  if (user) {
    res.status(201).json({
      success: true,
      message: `User ${user.firstName} ${user.lastName} created successfully`,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        nic: user.nic,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

/**
 * @desc    Get all users with pagination and filtering
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { search, email, role, firstName, lastName } = req.query;
  let query = {};

  // Build the query
  if (email) {
    query.email = { $regex: new RegExp(email, "i") };
  }

  if (role) {
    query.role = role;
  }

  if (firstName) {
    query.firstName = { $regex: new RegExp(firstName, "i") };
  }

  if (lastName) {
    query.lastName = { $regex: new RegExp(lastName, "i") };
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: new RegExp(search, "i") } },
      { lastName: { $regex: new RegExp(search, "i") } },
      { email: { $regex: new RegExp(search, "i") } },
    ];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Execute both queries in parallel for better performance
  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query), // Make sure to use the same query for accurate count
  ]);

  res.status(200).json({
    success: true,
    total,
    data: users,
  });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, nic, phone, role, password } = req.body;

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (
    !firstName &&
    !lastName &&
    !email &&
    !nic &&
    !phone &&
    !role &&
    !password
  ) {
    res.status(400);
    throw new Error("Please provide at least one field to update");
  }

  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error("Email already exists");
    }
  }

  if (nic && nic !== user.nic) {
    const nicExists = await User.findOne({ nic });
    if (nicExists) {
      res.status(400);
      throw new Error("NIC already exists");
    }
  }

  const updateData = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (email) updateData.email = email;
  if (nic) updateData.nic = nic;
  if (phone) updateData.phone = phone;
  if (role) updateData.role = role;
  if (password) updateData.password = password;

  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.status(200).json({
    success: true,
    message: `User ${updatedUser.firstName} ${updatedUser.lastName} updated successfully`,
    data: updatedUser,
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error("User ID is required");
  }

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  await User.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: `User ${user.firstName} ${user.lastName} deleted successfully`,
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { firstName, lastName, email, nic, phone, password } = req.body;

  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error("Email already exists");
    }
  }

  if (nic && nic !== user.nic) {
    const nicExists = await User.findOne({ nic });
    if (nicExists) {
      res.status(400);
      throw new Error("NIC already exists");
    }
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (email) user.email = email;
  if (nic) user.nic = nic;
  if (phone) user.phone = phone;
  if (password) user.password = password;

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      nic: updatedUser.nic,
      phone: updatedUser.phone,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    },
  });
});

export {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getCurrentUserProfile,
  updateCurrentUserProfile,
};
