import { Server as SocketIOServer } from 'socket.io';

export interface JWTUser{
    id: string,
    email: string
}

export interface GraphqlContext{
    user?: any
    io: SocketIOServer
}