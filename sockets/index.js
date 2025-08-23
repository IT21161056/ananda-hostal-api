// sockets/index.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const socketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      console.log("Socket authentication attempt:", socket.id);
      
      // Get token from multiple sources
      const token = socket.handshake.auth.token || 
                   socket.handshake.query.token ||
                   (socket.handshake.headers.authorization && socket.handshake.headers.authorization.replace('Bearer ', ''));
      
      console.log("Token received:", token ? token.substring(0, 20) + "..." : "No token");

      if (!token) {
        console.log("No token provided");
        return next(new Error("Authentication error: No token provided"));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); 
      console.log("Token decoded successfully, user ID:", decoded.user.id);
      
      // Get user from database
      const user = await User.findById(decoded.user.id).select("-password");
      if (!user) {
        console.log("User not found in database");
        return next(new Error("Authentication error: User not found"));
      }

      console.log("User found:", user.email, "Role:", user.role);

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error.message);
      
      if (error.name === "JsonWebTokenError") {
        return next(new Error("Authentication error: Invalid token"));
      } else if (error.name === "TokenExpiredError") {
        return next(new Error("Authentication error: Token expired"));
      }
      
      return next(new Error("Authentication error: " + error.message));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User authenticated and connected: ${socket.id}, User ID: ${socket.user?._id}, Email: ${socket.user?.email}`);

    // User automatically joins their personal room after authentication
    if (socket.user && socket.user._id) {
      const userId = socket.user._id.toString();
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
      
      // Send authentication success message
      socket.emit("authentication_success", { 
        message: "Successfully authenticated and connected",
        userId: userId,
        userEmail: socket.user.email
      });
    }

    // Handle authentication event from client
    socket.on("authenticate", (data) => {
      console.log("Received authenticate event:", data);
      // This is just confirmation, authentication already happened in middleware
      socket.emit("authentication_success", { 
        message: "Already authenticated",
        userId: socket.user._id.toString()
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.id}, Reason: ${reason}, User: ${socket.user?.email}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.user?.email}:`, error);
    });
  });
};

export default socketHandler;