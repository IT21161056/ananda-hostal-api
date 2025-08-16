// sockets/index.js
import chatSocket from "./chat.socket.js";
import notificationSocket from "./notification.socket.js";

export default function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // User joins their own room
    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their private room`);
    });

    // Attach features
    chatSocket(io, socket);
    notificationSocket(io, socket);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}
