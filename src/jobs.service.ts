import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { AuthService } from './auth.service';
import { SocketRegistry } from './socket.registry';

export interface JobInput {
  title?: string;
  description?: string;
  category?: string;
  skills?: string[];
  budgetMin?: number;
  budgetMax?: number;
  duration?: string;
  location?: string;
  remote?: boolean;
}

export interface JobFilters {
  query?: string;
  category?: string;
  skill?: string;
  status?: string;
}

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private registry: SocketRegistry,
  ) {}

  async list(f: JobFilters, viewerId?: string, viewerRole?: string) {
    const or: Prisma.JobWhereInput[] = [];
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
    if (f.skill) or.push({ skills: { has: f.skill.trim() } });

    const jobs = await this.prisma.job.findMany({
      where: {
        status: f.status === 'all' ? undefined : (f.status as JobStatus) ?? JobStatus.OPEN,
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
      if (viewerId && viewerRole === Role.FREELANCER) {
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

  async get(jobId: string, viewerId?: string, viewerRole?: string) {
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
    if (!job) throw new NotFoundException('Job not found');
    const isOwner = viewerId === job.ownerId;

    let applied = false;
    if (viewerId && viewerRole === Role.FREELANCER) {
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

  async create(userId: string, dto: JobInput) {
    const input = this.validate(dto);
    const job = await this.prisma.job.create({ data: { ownerId: userId, ...input } as Prisma.JobUncheckedCreateInput });
    return this.get(job.id, userId, 'client');
  }

  async update(userId: string, jobId: string, dto: JobInput) {
    await this.ownerJob(userId, jobId);
    const input = this.validate(dto, true);
    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: input as Prisma.JobUncheckedUpdateInput,
    });
    return this.get(updated.id, userId, 'client');
  }

  async close(userId: string, jobId: string) {
    const job = await this.ownerJob(userId, jobId);
    await this.prisma.job.update({ where: { id: jobId }, data: { status: JobStatus.CLOSED } });
    return job.status;
  }

  async apply(userId: string, jobId: string, coverLetter: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== JobStatus.OPEN) throw new BadRequestException('This job is no longer accepting applications');
    if (job.ownerId === userId) throw new BadRequestException('You cannot apply to your own job');
    if (!coverLetter || coverLetter.trim().length < 20) {
      throw new BadRequestException('Cover letter must be at least 20 characters');
    }
    const existing = await this.prisma.application.findUnique({
      where: { jobId_freelancerId: { jobId, freelancerId: userId } },
    });
    if (existing) throw new BadRequestException('You have already applied to this job');

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

  async mine(userId: string) {
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

  async myApplications(userId: string) {
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

  async decideApplication(userId: string, applicationId: string, action: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true, freelancer: { select: { id: true, name: true } } },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.job.ownerId !== userId) throw new ForbiddenException('Not your job listing');
    if (application.job.status !== JobStatus.OPEN) throw new BadRequestException('Job is closed');

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

  private async ownerJob(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.ownerId !== userId) throw new ForbiddenException('You can only manage your own jobs');
    return job;
  }

  private validate(dto: JobInput, partial = false): Omit<Prisma.JobUncheckedCreateInput, 'ownerId'> {
    if (!partial) {
      if (!dto.title || dto.title.trim().length < 5) throw new BadRequestException('Title must be at least 5 characters');
      if (!dto.description || dto.description.trim().length < 30) throw new BadRequestException('Description must be at least 30 characters');
      if (!dto.category) throw new BadRequestException('Category is required');
      if (dto.budgetMin === undefined || dto.budgetMin <= 0) throw new BadRequestException('A valid minimum budget is required');
    }
    const data: Prisma.JobUncheckedCreateInput = {} as Prisma.JobUncheckedCreateInput;
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.skills !== undefined) data.skills = dto.skills.map((s) => s.trim()).filter(Boolean);
    if (dto.budgetMin !== undefined) data.budgetMin = dto.budgetMin;
    if (dto.budgetMax !== undefined) data.budgetMax = dto.budgetMax;
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.remote !== undefined) data.remote = dto.remote;
    if (dto.budgetMax !== undefined && dto.budgetMax < (data.budgetMin ?? dto.budgetMin ?? 0) && !partial) {
      throw new BadRequestException('Maximum budget must be greater than minimum');
    }
    return data;
  }
}