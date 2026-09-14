import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { FreelancersService } from './freelancers.service';
import { JobsService } from './jobs.service';
import { RequestsService } from './requests.service';
import { SocketRegistry } from './socket.registry';

interface ReqBody {
  id?: string | number;
  event?: string;
  payload?: any;
}

const CORS = { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true };

@WebSocketGateway({ cors: CORS })
export class ApiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private auth: AuthService,
    private freelancers: FreelancersService,
    private jobs: JobsService,
    private requests: RequestsService,
    private registry: SocketRegistry,
  ) {}

  handleConnection(socket: Socket) {
    if (socket.data.userId) this.registry.register(socket.data.userId as string, socket);
  }

  handleDisconnect(socket: Socket) {
    this.registry.unregister(socket);
  }

  @SubscribeMessage('req')
  async handleReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: ReqBody,
  ) {
    const event = body?.event || '';
    const requestId = body?.id ?? null;
    const payload = body?.payload ?? {};
    try {
      const data = await this.route(socket, event, payload);
      socket.emit('res', { id: requestId, event, ok: true, data: data ?? null });
    } catch (e: any) {
      socket.emit('res', { id: requestId, event, ok: false, error: e?.message || 'Something went wrong' });
    }
  }

  private async route(socket: Socket, event: string, payload: any) {
    switch (event) {
      case 'auth:register':
        return this.auth.register(payload);
      case 'auth:login':
        return this.auth.login(payload);

      case 'auth:me':
        return this.auth.me(this.user(socket));

      case 'freelancers:list':
        return this.freelancers.list(payload || {});
      case 'freelancers:get':
        return this.freelancers.get(this.need(payload, 'id'));
      case 'profile:update': {
        const data = payload?.data ?? payload;
        return this.auth.updateProfile(this.user(socket), this.user(socket), data || {});
      }

      case 'jobs:list':
        return this.jobs.list(
          payload || {},
          socket.data.userId as string | undefined,
          this.role(socket),
        );
      case 'jobs:get':
        return this.jobs.get(
          this.need(payload, 'id'),
          socket.data.userId as string | undefined,
          this.role(socket),
        );
      case 'jobs:create':
        this.requireRole(socket, Role.CLIENT);
        return this.jobs.create(this.user(socket), payload || {});
      case 'jobs:update':
        this.requireRole(socket, Role.CLIENT);
        return this.jobs.update(this.user(socket), this.need(payload, 'id'), payload?.data ?? {});
      case 'jobs:close':
        this.requireRole(socket, Role.CLIENT);
        return this.jobs.close(this.user(socket), this.need(payload, 'id'));
      case 'jobs:apply':
        this.requireRole(socket, Role.FREELANCER);
        return this.jobs.apply(this.user(socket), this.need(payload, 'id'), payload?.coverLetter || '');
      case 'jobs:mine':
        this.requireRole(socket, Role.CLIENT);
        return this.jobs.mine(this.user(socket));
      case 'applications:mine':
        this.requireRole(socket, Role.FREELANCER);
        return this.jobs.myApplications(this.user(socket));
      case 'applications:decide':
        this.requireRole(socket, Role.CLIENT);
        return this.jobs.decideApplication(
          this.user(socket),
          this.need(payload, 'applicationId'),
          payload?.action || '',
        );

      case 'requests:create':
        this.requireRole(socket, Role.CLIENT);
        return this.requests.create(this.user(socket), payload || {});
      case 'requests:inbox':
        this.requireRole(socket, Role.FREELANCER);
        return this.requests.inbox(this.user(socket));
      case 'requests:sent':
        this.requireRole(socket, Role.CLIENT);
        return this.requests.sent(this.user(socket));
      case 'requests:decide':
        this.requireRole(socket, Role.FREELANCER);
        return this.requests.decide(this.user(socket), this.need(payload, 'id'), payload?.action || '');

      case 'me:summary':
        return this.requests.summary(this.user(socket), this.role(socket) as string);

      default:
        throw new BadRequestException(`Unknown event: ${event}`);
    }
  }

  private role(socket: Socket): Role | undefined {
    if (socket.data.role === Role.FREELANCER) return Role.FREELANCER;
    if (socket.data.role === Role.CLIENT) return Role.CLIENT;
    return undefined;
  }

  private user(socket: Socket): string {
    const id = socket.data.userId;
    if (!id) throw new UnauthorizedException('Please log in to continue');
    return id as string;
  }

  private requireRole(socket: Socket, role: Role) {
    if (socket.data.role !== role) {
      throw new ForbiddenException(`This action requires a ${role.toLowerCase()} account`);
    }
  }

  private need(payload: any, key: string): string {
    const value = payload?.[key];
    if (!value) throw new BadRequestException(`Missing required field: ${key}`);
    return String(value);
  }
}