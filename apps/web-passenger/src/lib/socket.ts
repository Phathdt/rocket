import { io, type Socket } from 'socket.io-client';

// Traefik routes the Socket.IO default path (/socket.io) to realtime-service.
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;

  socket = io(GATEWAY_URL, {
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinTrip(tripId: string, token: string): Socket {
  const s = getSocket(token);
  s.emit('joinTrip', { tripId });
  return s;
}

export function leaveTrip(tripId: string): void {
  if (socket) {
    socket.emit('leaveTrip', { tripId });
  }
}
