import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer;

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
      console.log("User is Connected:" ,userId);
    })

   //User join a Chat
    socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });
  
    //Send Message one to one
    socket.on("sendMessage", (message) => {
        io.emit("receivedMessage", message);
    });

    // User Typing Indicator functionality starts here
    socket.on("typing", () => {
      socket.broadcast.emit("typing")
    })

    socket.on('stop typing', () => {
      socket.broadcast.emit('stop typing');
    });
    // User Typing functionality ends here

    socket.on("disconnect", () => {
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
