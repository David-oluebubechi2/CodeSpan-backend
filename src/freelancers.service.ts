import { Injectable, NotFoundException } from '@nestjs/common';
import { Availability, Prisma, Role } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { AuthService } from './auth.service';
import { SocketRegistry } from './socket.registry';

export interface FreelancerFilters {
  query?: string;
  category?: string;
  skill?: string;
  minRate?: number;
  maxRate?: number;
  availability?: string;
  sort?: string;
}

@Injectable()
export class FreelancersService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private registry: SocketRegistry,
  ) {}

  async list(f: FreelancerFilters) {
    const or: Prisma.UserWhereInput[] = [];
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

    let orderBy: Prisma.UserOrderByWithRelationInput = { rating: 'desc' };
    switch (f.sort) {
      case 'rate_desc': orderBy = { hourlyRate: 'desc' }; break;
      case 'rate_asc': orderBy = { hourlyRate: 'asc' }; break;
      case 'newest': orderBy = { createdAt: 'desc' }; break;
      default: orderBy = { rating: 'desc' };
    }

    const users = await this.prisma.user.findMany({
      where: {
        role: Role.FREELANCER,
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

  async get(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.FREELANCER },
    });
    if (!user) throw new NotFoundException('Freelancer not found');
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

  private mapAvail(v: string): Availability {
    if (v === 'busy') return Availability.BUSY;
    if (v === 'part-time') return Availability.PART_TIME;
    return Availability.AVAILABLE;
  }
}