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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("./prisma.service");
const auth_service_1 = require("./auth.service");
let RequestsService = class RequestsService {
    prisma;
    auth;
    constructor(prisma, auth) {
        this.prisma = prisma;
        this.auth = auth;
    }
    async create(userId, dto) {
        if (!dto.freelancerId)
            throw new common_1.BadRequestException('Select a freelancer');
        if (!dto.title || dto.title.trim().length < 5)
            throw new common_1.BadRequestException('Title must be at least 5 characters');
        if (!dto.description || dto.description.trim().length < 20)
            throw new common_1.BadRequestException('Description must be at least 20 characters');
        const freelancer = await this.prisma.user.findFirst({
            where: { id: dto.freelancerId, role: client_1.Role.FREELANCER },
        });
        if (!freelancer)
            throw new common_1.NotFoundException('Freelancer not found');
        if (freelancer.id === userId)
            throw new common_1.BadRequestException('You cannot send a request to yourself');
        const request = await this.prisma.projectRequest.create({
            data: {
                clientId: userId,
                freelancerId: freelancer.id,
                title: dto.title.trim(),
                description: dto.description.trim(),
                budget: dto.budget && dto.budget > 0 ? dto.budget : null,
            },
            include: { client: true },
        });
        return this.shape(request);
    }
    async inbox(userId) {
        const requests = await this.prisma.projectRequest.findMany({
            where: { freelancerId: userId },
            include: { client: true },
            orderBy: { createdAt: 'desc' },
        });
        return requests.map((r) => this.shape(r));
    }
    async sent(userId) {
        const requests = await this.prisma.projectRequest.findMany({
            where: { clientId: userId },
            include: { freelancer: true },
            orderBy: { createdAt: 'desc' },
        });
        return requests.map((r) => this.shape(r));
    }
    async decide(userId, requestId, action) {
        const request = await this.prisma.projectRequest.findUnique({ where: { id: requestId } });
        if (!request)
            throw new common_1.NotFoundException('Request not found');
        if (request.freelancerId !== userId)
            throw new common_1.ForbiddenException('This request was not sent to you');
        if (request.status !== client_1.RequestStatus.PENDING)
            throw new common_1.BadRequestException('Request already responded to');
        const status = action === 'accept' ? client_1.RequestStatus.ACCEPTED : client_1.RequestStatus.REJECTED;
        await this.prisma.projectRequest.update({ where: { id: requestId }, data: { status } });
        return { id: requestId, status: status.toLowerCase() };
    }
    async summary(userId, role) {
        if (role === 'freelancer') {
            const [inbox, applications] = await Promise.all([
                this.prisma.projectRequest.findMany({
                    where: { freelancerId: userId },
                    select: { id: true, status: true },
                }),
                this.prisma.application.findMany({
                    where: { freelancerId: userId, status: 'PENDING' },
                    select: { id: true },
                }),
            ]);
            return {
                receivedRequests: inbox.length,
                acceptedRequests: inbox.filter((r) => r.status === client_1.RequestStatus.ACCEPTED).length,
                pendingApplications: applications.length,
            };
        }
        const [sent, jobs] = await Promise.all([
            this.prisma.projectRequest.findMany({
                where: { clientId: userId },
                select: { id: true, status: true },
            }),
            this.prisma.job.findMany({
                where: { ownerId: userId, status: 'OPEN' },
                select: { id: true },
            }),
        ]);
        return {
            sentRequests: sent.length,
            acceptedRequests: sent.filter((r) => r.status === client_1.RequestStatus.ACCEPTED).length,
            openJobs: jobs.length,
        };
    }
    shape(r) {
        return {
            id: r.id,
            title: r.title,
            description: r.description,
            budget: r.budget,
            status: r.status.toLowerCase(),
            createdAt: r.createdAt,
            client: r.client ? this.auth.publicUser(r.client) : undefined,
            freelancer: r.freelancer ? this.auth.publicUser(r.freelancer) : undefined,
        };
    }
};
exports.RequestsService = RequestsService;
exports.RequestsService = RequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, auth_service_1.AuthService])
], RequestsService);
