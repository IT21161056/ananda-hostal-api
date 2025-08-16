// sockets/chat.socket.js
// import Chat from "../models/chat.model.js";

// export default function chatSocket(io, socket) {
//   console.log("Chat socket ready for:", socket.id);

//   socket.on("private-message", async (data) => {
//     const { sender, receiver, message } = data;

//     const newMsg = new Chat({ sender, receiver, message });
//     await newMsg.save();

//     // Send to receiver + sender
//     io.to(receiver).emit("private-message", newMsg);
//     io.to(sender).emit("private-message", newMsg);
//   });
// }

// sockets/chat.socket.js
export default function chatSocket(io, socket) {
  console.log("Chat socket ready for:", socket.id);

  // Track active users at the namespace level (not per socket)
  const activeUsers = new Map();

  // When a user joins the chat
  socket.on("join_chat", ({ username }) => {
    socket.username = username;
    activeUsers.set(socket.id, username);

    // Send current user list to the new user
    socket.emit("current_users", {
      users: Array.from(activeUsers.values()),
      userCount: activeUsers.size,
    });

    // Broadcast to all other users about the new join
    socket.broadcast.emit("user_joined", {
      username,
      userCount: activeUsers.size,
    });

    console.log(`${username} joined the chat`);
  });

  // When a message is received
  socket.on("chat_message", (messageData) => {
    socket.broadcast.emit("chat_message", {
      ...messageData,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("leave_chat", ({ username }) => {
    activeUsers.delete(socket.id);
    io.emit("user_left", {
      username,
      userCount: activeUsers.size,
    });
  });

  // When a user disconnects
  socket.on("disconnect", () => {
    if (socket.username) {
      activeUsers.delete(socket.id);
      io.emit("user_left", {
        username: socket.username,
        userCount: activeUsers.size,
      });
      console.log(`${socket.username} left the chat`);
    }
  });
}
