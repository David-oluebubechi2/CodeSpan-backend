import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestStatus, Role, User } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { AuthService } from './auth.service';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService, private auth: AuthService) {}

  async create(
    userId: string,
    dto: { freelancerId?: string; title?: string; description?: string; budget?: number },
  ) {
    if (!dto.freelancerId) throw new BadRequestException('Select a freelancer');
    if (!dto.title || dto.title.trim().length < 5) throw new BadRequestException('Title must be at least 5 characters');
    if (!dto.description || dto.description.trim().length < 20) throw new BadRequestException('Description must be at least 20 characters');

    const freelancer = await this.prisma.user.findFirst({
      where: { id: dto.freelancerId, role: Role.FREELANCER },
    });
    if (!freelancer) throw new NotFoundException('Freelancer not found');
    if (freelancer.id === userId) throw new BadRequestException('You cannot send a request to yourself');

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

  async inbox(userId: string) {
    const requests = await this.prisma.projectRequest.findMany({
      where: { freelancerId: userId },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => this.shape(r));
  }

  async sent(userId: string) {
    const requests = await this.prisma.projectRequest.findMany({
      where: { clientId: userId },
      include: { freelancer: true },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => this.shape(r));
  }

  async decide(userId: string, requestId: string, action: string) {
    const request = await this.prisma.projectRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.freelancerId !== userId) throw new ForbiddenException('This request was not sent to you');
    if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Request already responded to');

    const status = action === 'accept' ? RequestStatus.ACCEPTED : RequestStatus.REJECTED;
    await this.prisma.projectRequest.update({ where: { id: requestId }, data: { status } });
    return { id: requestId, status: status.toLowerCase() };
  }

  async summary(userId: string, role: string) {
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
        acceptedRequests: inbox.filter((r) => r.status === RequestStatus.ACCEPTED).length,
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
      acceptedRequests: sent.filter((r) => r.status === RequestStatus.ACCEPTED).length,
      openJobs: jobs.length,
    };
  }

  private shape(r: { id: string; title: string; description: string; budget: number | null; status: RequestStatus; createdAt: Date; client?: User; freelancer?: User }) {
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
}