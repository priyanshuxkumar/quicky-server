import { Server as SocketIOServer } from "socket.io";
import { produceMessage } from "../kafka/producer";
import { consumeMessages } from "../kafka/consumer";

let io: SocketIOServer;

const userToSocketMapping:any = new Map();
const socketToUserMapping:any = new Map();

export function initSocket(server: any) {
  io = new SocketIOServer(server, {
    pingTimeout: 60000,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Connected to socket.io", socket.id);

    socket.on('setup' , (userId) => {
      userToSocketMapping.set(userId, socket.id);
      socketToUserMapping.set(socket.id, userId);
      console.log("User is Connected:" , userId);
    })

   //User join a Chat
    socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });
  
    //Send Message one to one
    socket.on("sendMessage", async (message) => {
        io.emit("receivedMessage", message);
        //Kafka produce message
        await produceMessage(message)
    });

    // User Typing Indicator functionality starts here
    socket.on("typing", ({userId}) => {
      const recipientSocketId = userToSocketMapping.get(userId);
      const senderUserId = socketToUserMapping.get(socket.id);
      if (recipientSocketId) {
          socket.to(recipientSocketId).emit('typing', { userId: senderUserId });
      }
    })

    socket.on('stop typing', ({userId}) => {
      const recipientSocketId = userToSocketMapping.get(userId);
      const senderUserId = socketToUserMapping.get(socket.id);
      if (recipientSocketId) {
          socket.to(recipientSocketId).emit('stop typing', { userId: senderUserId });
      }
    });
    // User Typing functionality ends here

    socket.on("disconnect", () => {
      const userId = socketToUserMapping.get(socket.id);
      if (userId) {
        userToSocketMapping.delete(userId);
        socketToUserMapping.delete(socket.id);
      }
      console.log("Disconnected from socket.io", socket.id);
    });
  });

  return io;
}

export function getSocket() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

module.exports = { initSocket, getSocket };
