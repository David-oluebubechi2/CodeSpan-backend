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
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("./prisma.service");
const auth_service_1 = require("./auth.service");
const socket_registry_1 = require("./socket.registry");
let JobsService = class JobsService {
    prisma;
    auth;
    registry;
    constructor(prisma, auth, registry) {
        this.prisma = prisma;
        this.auth = auth;
        this.registry = registry;
    }
    async list(f, viewerId, viewerRole) {
        const or = [];
        const query = (f.query || '').trim();
        if (query) {
            or.push({
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { skills: { has: query } },
                ],
            });
        }
        if (f.skill)
            or.push({ skills: { has: f.skill.trim() } });
        const jobs = await this.prisma.job.findMany({
            where: {
                status: f.status === 'all' ? undefined : f.status ?? client_1.JobStatus.OPEN,
                category: f.category || undefined,
                OR: or.length ? or : undefined,
            },
            include: {
                owner: { select: { id: true, name: true, avatarHue: true, title: true, verified: true } },
                applications: { select: { id: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return Promise.all(jobs.map(async (job) => {
            let applied = false;
            if (viewerId && viewerRole === client_1.Role.FREELANCER) {
                applied = !!await this.prisma.application.findUnique({
                    where: { jobId_freelancerId: { jobId: job.id, freelancerId: viewerId } },
                    select: { id: true },
                });
            }
            return {
                ...job,
                status: job.status.toLowerCase(),
                applications: undefined,
                applicationCount: job.applications.length,
                applied,
                owner: { ...job.owner, online: this.registry.isOnline(job.owner.id) },
            };
        }));
    }
    async get(jobId, viewerId, viewerRole) {
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
            include: {
                owner: { select: { id: true, name: true, avatarHue: true, title: true, verified: true } },
                applications: {
                    include: { freelancer: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        const isOwner = viewerId === job.ownerId;
        let applied = false;
        if (viewerId && viewerRole === client_1.Role.FREELANCER) {
            applied = !!await this.prisma.application.findUnique({
                where: { jobId_freelancerId: { jobId, freelancerId: viewerId } },
                select: { id: true },
            });
        }
        return {
            id: job.id,
            ownerId: job.ownerId,
            owner: { ...job.owner, online: this.registry.isOnline(job.owner.id) },
            title: job.title,
            description: job.description,
            category: job.category,
            skills: job.skills,
            budgetMin: job.budgetMin,
            budgetMax: job.budgetMax,
            duration: job.duration,
            location: job.location,
            remote: job.remote,
            status: job.status.toLowerCase(),
            createdAt: job.createdAt,
            applicationCount: job.applications.length,
            applied,
            applications: isOwner
                ? job.applications.map((a) => ({
                    id: a.id,
                    coverLetter: a.coverLetter,
                    status: a.status.toLowerCase(),
                    createdAt: a.createdAt,
                    freelancer: { ...this.auth.publicUser(a.freelancer), online: this.registry.isOnline(a.freelancer.id) },
                }))
                : null,
        };
    }
    async create(userId, dto) {
        const input = this.validate(dto);
        const job = await this.prisma.job.create({ data: { ownerId: userId, ...input } });
        return this.get(job.id, userId, 'client');
    }
    async update(userId, jobId, dto) {
        await this.ownerJob(userId, jobId);
        const input = this.validate(dto, true);
        const updated = await this.prisma.job.update({
            where: { id: jobId },
            data: input,
        });
        return this.get(updated.id, userId, 'client');
    }
    async close(userId, jobId) {
        const job = await this.ownerJob(userId, jobId);
        await this.prisma.job.update({ where: { id: jobId }, data: { status: client_1.JobStatus.CLOSED } });
        return job.status;
    }
    async apply(userId, jobId, coverLetter) {
        const job = await this.prisma.job.findUnique({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (job.status !== client_1.JobStatus.OPEN)
            throw new common_1.BadRequestException('This job is no longer accepting applications');
        if (job.ownerId === userId)
            throw new common_1.BadRequestException('You cannot apply to your own job');
        if (!coverLetter || coverLetter.trim().length < 20) {
            throw new common_1.BadRequestException('Cover letter must be at least 20 characters');
        }
        const existing = await this.prisma.application.findUnique({
            where: { jobId_freelancerId: { jobId, freelancerId: userId } },
        });
        if (existing)
            throw new common_1.BadRequestException('You have already applied to this job');
        const application = await this.prisma.application.create({
            data: { jobId, freelancerId: userId, coverLetter: coverLetter.trim() },
            include: { freelancer: { select: { id: true, name: true, title: true, avatarHue: true } } },
        });
        this.registry.emitToUser(job.ownerId, 'notification', {
            type: 'application',
            jobId,
            jobTitle: job.title,
            freelancer: application.freelancer,
            createdAt: application.createdAt,
        });
        return { id: application.id, status: application.status.toLowerCase(), applied: true };
    }
    async mine(userId) {
        const jobs = await this.prisma.job.findMany({
            where: { ownerId: userId },
            include: { applications: { select: { id: true, status: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return jobs.map((j) => ({
            id: j.id,
            title: j.title,
            category: j.category,
            status: j.status.toLowerCase(),
            budgetMin: j.budgetMin,
            budgetMax: j.budgetMax,
            createdAt: j.createdAt,
            applicationCount: j.applications.length,
            pendingCount: j.applications.filter((a) => a.status === 'PENDING').length,
        }));
    }
    async myApplications(userId) {
        const applications = await this.prisma.application.findMany({
            where: { freelancerId: userId },
            include: { job: true },
            orderBy: { createdAt: 'desc' },
        });
        return applications.map((a) => ({
            id: a.id,
            status: a.status.toLowerCase(),
            coverLetter: a.coverLetter,
            createdAt: a.createdAt,
            job: {
                id: a.job.id,
                title: a.job.title,
                category: a.job.category,
                status: a.job.status.toLowerCase(),
                budgetMin: a.job.budgetMin,
                budgetMax: a.job.budgetMax,
            },
        }));
    }
    async decideApplication(userId, applicationId, action) {
        const application = await this.prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true, freelancer: { select: { id: true, name: true } } },
        });
        if (!application)
            throw new common_1.NotFoundException('Application not found');
        if (application.job.ownerId !== userId)
            throw new common_1.ForbiddenException('Not your job listing');
        if (application.job.status !== client_1.JobStatus.OPEN)
            throw new common_1.BadRequestException('Job is closed');
        const status = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
        await this.prisma.application.update({ where: { id: applicationId }, data: { status } });
        this.registry.emitToUser(application.freelancerId, 'notification', {
            type: 'applicationDecision',
            applicationId,
            jobId: application.job.id,
            jobTitle: application.job.title,
            status: action === 'accept' ? 'ACCEPTED' : 'REJECTED',
        });
        return { id: applicationId, status: status.toLowerCase() };
    }
    async ownerJob(userId, jobId) {
        const job = await this.prisma.job.findUnique({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (job.ownerId !== userId)
            throw new common_1.ForbiddenException('You can only manage your own jobs');
        return job;
    }
    validate(dto, partial = false) {
        if (!partial) {
            if (!dto.title || dto.title.trim().length < 5)
                throw new common_1.BadRequestException('Title must be at least 5 characters');
            if (!dto.description || dto.description.trim().length < 30)
                throw new common_1.BadRequestException('Description must be at least 30 characters');
            if (!dto.category)
                throw new common_1.BadRequestException('Category is required');
            if (dto.budgetMin === undefined || dto.budgetMin <= 0)
                throw new common_1.BadRequestException('A valid minimum budget is required');
        }
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title.trim();
        if (dto.description !== undefined)
            data.description = dto.description.trim();
        if (dto.category !== undefined)
            data.category = dto.category;
        if (dto.skills !== undefined)
            data.skills = dto.skills.map((s) => s.trim()).filter(Boolean);
        if (dto.budgetMin !== undefined)
            data.budgetMin = dto.budgetMin;
        if (dto.budgetMax !== undefined)
            data.budgetMax = dto.budgetMax;
        if (dto.duration !== undefined)
            data.duration = dto.duration;
        if (dto.location !== undefined)
            data.location = dto.location;
        if (dto.remote !== undefined)
            data.remote = dto.remote;
        if (dto.budgetMax !== undefined && dto.budgetMax < (data.budgetMin ?? dto.budgetMin ?? 0) && !partial) {
            throw new common_1.BadRequestException('Maximum budget must be greater than minimum');
        }
        return data;
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auth_service_1.AuthService,
        socket_registry_1.SocketRegistry])
], JobsService);
