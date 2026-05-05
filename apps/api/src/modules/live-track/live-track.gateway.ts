import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/live-track',
})
export class LiveTrackGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth as Record<string, string>)?.token ||
      client.handshake.headers?.authorization?.toString().replace('Bearer ', '');

    if (!token) {
      client.disconnect();
      return;
    }

    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';

    try {
      const payload = verify(token, secret) as Record<string, unknown>;
      client.data.userId = payload.sub ?? payload.userId;
      // Live-track JWTs carry trekId; auto-join the trek room.
      if (typeof payload.trekId === 'string') {
        client.join(`trek:${payload.trekId}`);
        client.data.trekId = payload.trekId;
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // socket.io removes client from all rooms automatically on disconnect
  }

  @SubscribeMessage('join-trek')
  handleJoinTrek(
    @ConnectedSocket() client: Socket,
    @MessageBody() trekId: string,
  ) {
    if (client.data.userId) {
      client.join(`trek:${trekId}`);
    }
    return { event: 'joined', data: trekId };
  }

  emitPingToTrek(
    trekId: string,
    ping: {
      lat: number;
      lng: number;
      altitudeMeters?: number;
      recordedAt: string;
      offRoute: boolean;
      altitudeAlert: string | null;
    },
  ) {
    this.server.to(`trek:${trekId}`).emit('ping', ping);
    if (ping.offRoute) {
      this.server.to(`trek:${trekId}`).emit('off-route', { trekId });
    }
    if (ping.altitudeAlert) {
      this.server.to(`trek:${trekId}`).emit('altitude-alert', { trekId, alert: ping.altitudeAlert });
    }
  }
}
