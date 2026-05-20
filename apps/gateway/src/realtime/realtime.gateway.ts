import { Logger } from '@nestjs/common';
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

interface JwtPayload {
  sub: string;
  role: string;
  email: string;
}

/**
 * Socket.IO gateway mounted on the same port as the HTTP server (port 3000).
 * Handshake auth: client sends JWT in socket.handshake.auth.token.
 * Rooms follow the convention `trip:<tripId>`.
 */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
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
      // Attach user info to socket data for later use
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

  /** Emit a trip lifecycle update to all clients in the trip room. */
  emitTripUpdate(tripId: string, payload: Record<string, unknown>): void {
    this.server.to(`trip:${tripId}`).emit('trip:update', payload);
  }

  /** Emit a driver location update to all clients in the trip room. */
  emitDriverLocation(tripId: string, payload: { lat: number; lng: number; driverId: string }): void {
    this.server.to(`trip:${tripId}`).emit('driver:location', payload);
  }
}
