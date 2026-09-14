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
exports.FreelancersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("./prisma.service");
const auth_service_1 = require("./auth.service");
const socket_registry_1 = require("./socket.registry");
let FreelancersService = class FreelancersService {
    prisma;
    auth;
    registry;
    constructor(prisma, auth, registry) {
        this.prisma = prisma;
        this.auth = auth;
        this.registry = registry;
    }
    async list(f) {
        const or = [];
        const query = (f.query || '').trim();
        if (query) {
            or.push({
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { title: { contains: query, mode: 'insensitive' } },
                    { bio: { contains: query, mode: 'insensitive' } },
                    { skills: { has: query } },
                ],
            });
        }
        if (f.skill) {
            or.push({
                OR: [
                    { skills: { has: f.skill.trim() } },
                    { title: { contains: f.skill.trim(), mode: 'insensitive' } },
                    { category: { contains: f.skill.trim(), mode: 'insensitive' } },
                ],
            });
        }
        let orderBy = { rating: 'desc' };
        switch (f.sort) {
            case 'rate_desc':
                orderBy = { hourlyRate: 'desc' };
                break;
            case 'rate_asc':
                orderBy = { hourlyRate: 'asc' };
                break;
            case 'newest':
                orderBy = { createdAt: 'desc' };
                break;
            default: orderBy = { rating: 'desc' };
        }
        const users = await this.prisma.user.findMany({
            where: {
                role: client_1.Role.FREELANCER,
                category: f.category || undefined,
                availability: f.availability ? this.mapAvail(f.availability) : undefined,
                hourlyRate: { gte: f.minRate ?? undefined, lte: f.maxRate ?? undefined },
                AND: undefined,
                OR: or.length ? or : undefined,
            },
            orderBy,
        });
        return users.map((u) => ({
            ...this.auth.publicUser(u),
            online: this.registry.isOnline(u.id),
        }));
    }
    async get(id) {
        const user = await this.prisma.user.findFirst({
            where: { id, role: client_1.Role.FREELANCER },
        });
        if (!user)
            throw new common_1.NotFoundException('Freelancer not found');
        const applications = await this.prisma.application.findMany({
            where: { freelancerId: user.id, status: 'ACCEPTED' },
            select: { jobId: true },
        });
        return {
            ...this.auth.publicUser(user),
            online: this.registry.isOnline(user.id),
            reviewedJobs: applications.map((a) => a.jobId),
        };
    }
    mapAvail(v) {
        if (v === 'busy')
            return client_1.Availability.BUSY;
        if (v === 'part-time')
            return client_1.Availability.PART_TIME;
        return client_1.Availability.AVAILABLE;
    }
};
exports.FreelancersService = FreelancersService;
exports.FreelancersService = FreelancersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auth_service_1.AuthService,
        socket_registry_1.SocketRegistry])
], FreelancersService);
