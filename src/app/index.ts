import express from "express";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { User } from "./user";
import { GraphqlContext } from "../interfaces";
import JWTService from "../services/jwt";

import {Server as SocketIOServer } from "socket.io"
import { createServer } from "http"
import cors from "cors"


let io:SocketIOServer;

export async function initServer() {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());

  const graphqlServer = new ApolloServer<GraphqlContext>({
    typeDefs: `
        ${User.types}

        type Query { 
          ${User.queries}
        }
        type Mutation {
          ${User.mutations}
        }
    `,
    resolvers: {
      Query: {
        ...User.resolvers.queries,
      },
      Mutation: {
        ...User.resolvers.mutations,
      },
    },
  });
  await graphqlServer.start();

  //Create HTTP server
  const httpServer = createServer(app);
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  //handle socket connections
  io.on("connection", (socket) => {
    console.log("user is connected");

      //When user join a Chat
    socket.on("join chat", (room) => {
      socket.join(room);
      console.log("User Joined Room: " + room);
    });

    socket.on("sendMessage", (message) => {
      // Broadcast the message to all connected clients
      io.emit("receivedMessage", message);
    });

    socket.on("disconnect", () => {
      console.log("user is disconnected");
    });

    
  });

  app.use("/graphql",expressMiddleware(graphqlServer, {
      context: async ({ req, res }) => {
        return {
          user: req.headers.authorization
            ? JWTService.decodeToken(
                req.headers.authorization.split("Bearer ")[1]
              )
            : undefined,
            io
        };
      },
    })
  );

  return httpServer;
}
 