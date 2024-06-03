import express from "express";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { User } from "./user";
import { GraphqlContext } from "../interfaces";
import JWTService from "../services/jwt";
import { createServer } from "http";
import cors from "cors";

//SocketIO
import { initSocket, getSocket } from "../services/socket";

//Rate Limiter---
import {handleIncomingRequests} from "../middlewares/rateLimiter"

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
