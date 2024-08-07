import express from "express";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { User } from "./user";
import { Chat } from "./chat";
import { GraphqlContext } from "../interfaces";
import JWTService from "../services/jwt";
import { createServer } from "http";
import cors from "cors";

//SocketIO
import { initSocket } from "../services/socket";

//Rate Limiter---
import {handleIncomingRequests} from "../middlewares/rateLimiter"
import { Story } from "./story";
import { Auth } from "./auth";

export async function initServer() {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());

  //Using Rate Limiting Middleware
  app.use((req, res , next) => {
      const requestId = Date.now();
      if(handleIncomingRequests(requestId)){
          next(); 
      }else{
          res.status(429).send("Too many requests");
      }
  });

  const graphqlServer = new ApolloServer<GraphqlContext>({
    csrfPrevention: false,
    typeDefs: `
        ${User.types}
        ${Chat.types}
        ${Story.types}
        ${Auth.types}

        type Query { 
          ${User.queries}
          ${Chat.queries}
          ${Story.queries}
        }
        type Mutation {
          ${User.mutations}
          ${Chat.mutations}
          ${Story.mutations}
          ${Auth.mutations}
        }
    `,
    resolvers: {
      Query: {
        ...User.resolvers.queries,
        ...Chat.resolvers.queries,
        ...Story.resolvers.queries,
      },
      Mutation: {
        ...User.resolvers.mutations,
        ...Chat.resolvers.mutations,
        ...Story.resolvers.mutations,
        ...Auth.resolvers.mutations,
      },
    },
  });
  await graphqlServer.start();

  //Create HTTP server
  const httpServer = createServer(app);
  const io = initSocket(httpServer);

  app.use("/graphql", expressMiddleware(graphqlServer, {
      context: async ({ req, res }) => {
        return {
          user: req.headers.authorization
            ? JWTService.decodeToken(
                req.headers.authorization.split("Bearer ")[1]
              )
            : undefined,
          io,
        };
      },
    })
  );

  return httpServer;
}
