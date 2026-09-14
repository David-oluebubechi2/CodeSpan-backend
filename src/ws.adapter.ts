import { IoAdapter } from '@nestjs/platform-socket.io';
import { verify } from 'jsonwebtoken';
import { Socket, ServerOptions } from 'socket.io';
import { JwtPayload } from 'jsonwebtoken';

interface WsPayload extends JwtPayload {
  sub?: string;
  role?: string;
}

export class WsAuthAdapter extends IoAdapter {
  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.use((socket: Socket, next: (err?: Error) => void) => {
      const token = socket.handshake.auth?.token;
      if (typeof token === 'string' && token.length > 0) {
        try {
          const payload = verify(token, process.env.JWT_SECRET || 'codespan-dev-secret-change-in-prod') as WsPayload;
          socket.data.userId = payload.sub;
          socket.data.role = payload.role;
        } catch {
          socket.emit('auth', { ok: false, error: 'Invalid session' });
        }
      }
      next();
    });
    return server;
  }
}