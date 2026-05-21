import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { IRealtimeGateway } from '../domain/interfaces/realtime-gateway.interface';

interface JwtPayload {
  sub: string;
  role: string;
  email: string;
}

/**
 * Socket.IO gateway mounted on port 3004.
 * Handshake auth: client sends JWT in socket.handshake.auth.token.
 * Rooms follow the convention `trip:<tripId>`.
 *
 * @Injectable() is required here alongside @WebSocketGateway() so NestJS DI
 * can wire constructor deps (JwtService) and the WS module's SocketModule can
 * discover this gateway (it filters out useFactory providers via isNotMetatype).
 * All other classes in this module remain non-injectable and use useFactory wiring.
 *
 * Implements IRealtimeGateway so RedisSubscriberService depends on the
 * abstract token, not the concrete class.
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, IRealtimeGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(socket: Socket): void {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      this.logger.warn(`Socket ${socket.id} rejected: missing token`);
      socket.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      socket.data.user = { id: payload.sub, role: payload.role, email: payload.email };
      this.logger.log(`Socket ${socket.id} authenticated (userId=${payload.sub})`);
    } catch {
      this.logger.warn(`Socket ${socket.id} rejected: invalid token`);
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('joinTrip')
  handleJoinTrip(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { tripId: string },
  ): void {
    const room = `trip:${data.tripId}`;
    socket.join(room);
    this.logger.log(`Socket ${socket.id} joined room ${room}`);
  }

  @SubscribeMessage('leaveTrip')
  handleLeaveTrip(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { tripId: string },
  ): void {
    const room = `trip:${data.tripId}`;
    socket.leave(room);
    this.logger.log(`Socket ${socket.id} left room ${room}`);
  }

  emitTripUpdate(tripId: string, payload: Record<string, unknown>): void {
    this.server.to(`trip:${tripId}`).emit('trip:update', payload);
  }

  emitDriverLocation(
    tripId: string,
    payload: { lat: number; lng: number; driverId: string },
  ): void {
    this.server.to(`trip:${tripId}`).emit('driver:location', payload);
  }
}
