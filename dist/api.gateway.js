"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const auth_service_1 = require("./auth.service");
const freelancers_service_1 = require("./freelancers.service");
const jobs_service_1 = require("./jobs.service");
const requests_service_1 = require("./requests.service");
const socket_registry_1 = require("./socket.registry");
const CORS = { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true };
let ApiGateway = class ApiGateway {
    auth;
    freelancers;
    jobs;
    requests;
    registry;
    server;
    constructor(auth, freelancers, jobs, requests, registry) {
        this.auth = auth;
        this.freelancers = freelancers;
        this.jobs = jobs;
        this.requests = requests;
        this.registry = registry;
    }
    handleConnection(socket) {
        if (socket.data.userId)
            this.registry.register(socket.data.userId, socket);
    }
    handleDisconnect(socket) {
        this.registry.unregister(socket);
    }
    async handleReq(socket, body) {
        const event = body?.event || '';
        const requestId = body?.id ?? null;
        const payload = body?.payload ?? {};
        try {
            const data = await this.route(socket, event, payload);
            socket.emit('res', { id: requestId, event, ok: true, data: data ?? null });
        }
        catch (e) {
            socket.emit('res', { id: requestId, event, ok: false, error: e?.message || 'Something went wrong' });
        }
    }
    async route(socket, event, payload) {
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
                return this.jobs.list(payload || {}, socket.data.userId, this.role(socket));
            case 'jobs:get':
                return this.jobs.get(this.need(payload, 'id'), socket.data.userId, this.role(socket));
            case 'jobs:create':
                this.requireRole(socket, client_1.Role.CLIENT);
                return this.jobs.create(this.user(socket), payload || {});
            case 'jobs:update':
                this.requireRole(socket, client_1.Role.CLIENT);
                return this.jobs.update(this.user(socket), this.need(payload, 'id'), payload?.data ?? {});
            case 'jobs:close':
                this.requireRole(socket, client_1.Role.CLIENT);
                return this.jobs.close(this.user(socket), this.need(payload, 'id'));
            case 'jobs:apply':
                this.requireRole(socket, client_1.Role.FREELANCER);
                return this.jobs.apply(this.user(socket), this.need(payload, 'id'), payload?.coverLetter || '');
            case 'jobs:mine':
                this.requireRole(socket, client_1.Role.CLIENT);
                return this.jobs.mine(this.user(socket));
            case 'applications:mine':
                this.requireRole(socket, client_1.Role.FREELANCER);
                return this.jobs.myApplications(this.user(socket));
            case 'applications:decide':
                this.requireRole(socket, client_1.Role.CLIENT);
                return this.jobs.decideApplication(this.user(socket), this.need(payload, 'applicationId'), payload?.action || '');
            case 'requests:create':
                this.requireRole(socket, client_1.Role.CLIENT);
                return this.requests.create(this.user(socket), payload || {});
            case 'requests:inbox':
                this.requireRole(socket, client_1.Role.FREELANCER);
                return this.requests.inbox(this.user(socket));
            case 'requests:sent':
                this.requireRole(socket, client_1.Role.CLIENT);
                return this.requests.sent(this.user(socket));
            case 'requests:decide':
                this.requireRole(socket, client_1.Role.FREELANCER);
                return this.requests.decide(this.user(socket), this.need(payload, 'id'), payload?.action || '');
            case 'me:summary':
                return this.requests.summary(this.user(socket), this.role(socket));
            default:
                throw new common_1.BadRequestException(`Unknown event: ${event}`);
        }
    }
    role(socket) {
        if (socket.data.role === client_1.Role.FREELANCER)
            return client_1.Role.FREELANCER;
        if (socket.data.role === client_1.Role.CLIENT)
            return client_1.Role.CLIENT;
        return undefined;
    }
    user(socket) {
        const id = socket.data.userId;
        if (!id)
            throw new common_1.UnauthorizedException('Please log in to continue');
        return id;
    }
    requireRole(socket, role) {
        if (socket.data.role !== role) {
            throw new common_1.ForbiddenException(`This action requires a ${role.toLowerCase()} account`);
        }
    }
    need(payload, key) {
        const value = payload?.[key];
        if (!value)
            throw new common_1.BadRequestException(`Missing required field: ${key}`);
        return String(value);
    }
};
exports.ApiGateway = ApiGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ApiGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('req'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ApiGateway.prototype, "handleReq", null);
exports.ApiGateway = ApiGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: CORS }),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        freelancers_service_1.FreelancersService,
        jobs_service_1.JobsService,
        requests_service_1.RequestsService,
        socket_registry_1.SocketRegistry])
], ApiGateway);
