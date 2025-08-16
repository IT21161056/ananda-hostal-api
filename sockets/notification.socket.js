// sockets/notification.socket.js
import Notification from "../models/notification.model.js";

export default function notificationSocket(io, socket) {
  console.log("Notification socket ready for:", socket.id);

  socket.on("send-notification", async (data) => {
    const { user, title, message, type } = data;

    const notif = new Notification({ user, title, message, type });
    await notif.save();

    io.to(user).emit("notification", notif);
  });
}
