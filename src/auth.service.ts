import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma.service';
import { Availability, Role, User } from '@prisma/client';

export interface FreelancerProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarHue: number;
  title: string | null;
  bio: string | null;
  category: string | null;
  skills: string[];
  hourlyRate: number | null;
  experienceYears: number | null;
  location: string | null;
  availability: string;
  remote: string | null;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  verified: boolean;
  featured: boolean;
  completedJobs: number;
  rating: number | null;
  createdAt: Date;
}

const EDITABLE = [
  'title', 'bio', 'category', 'skills', 'hourlyRate', 'experienceYears',
  'location', 'availability', 'remote', 'website', 'github', 'linkedin',
] as const;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: { name?: string; email?: string; password?: string; role?: string }) {
    const name = (dto.name || '').trim();
    const email = (dto.email || '').trim().toLowerCase();
    const role = dto.role === 'freelancer' ? Role.FREELANCER : Role.CLIENT;
    if (!name) throw new BadRequestException('Name is required');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestException('A valid email is required');
    if (!dto.password || dto.password.length < 6) throw new BadRequestException('Password must be at least 6 characters');

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('An account with that email already exists');

    const user = await this.prisma.user.create({
      data: {
        name, email, role,
        passwordHash: await bcrypt.hash(dto.password, 10),
        avatarHue: Math.floor(Math.random() * 360),
      },
    });
    return this.issue(user);
  }

  async login(dto: { email?: string; password?: string }) {
    const email = (dto.email || '').trim().toLowerCase();
    if (!email || !dto.password) throw new UnauthorizedException('Email and password are required');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');
    return this.issue(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.publicUser(user);
  }

  async updateProfile(userId: string, id: string, dto: Record<string, unknown>) {
    if (userId !== id) throw new UnauthorizedException('You can only edit your own profile');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: Record<string, unknown> = {};
    for (const key of EDITABLE) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    if (data.skills !== undefined && !Array.isArray(data.skills)) {
      data.skills = String(data.skills).split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (data.availability !== undefined && typeof data.availability === 'string') {
      data.availability = mapAvailability(data.availability);
    }
    const updated = await this.prisma.user.update({ where: { id }, data });
    return this.publicUser(updated);
  }

  private issue(user: User) {
    const payload = { sub: user.id, role: user.role };
    const token = this.jwt.sign(payload);
    return { token, user: this.publicUser(user) };
  }

  publicUser(u: User): FreelancerProfile {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role.toLowerCase(),
      avatarHue: u.avatarHue,
      title: u.title,
      bio: u.bio,
      category: u.category,
      skills: u.skills,
      hourlyRate: u.hourlyRate,
      experienceYears: u.experienceYears,
      location: u.location,
      availability: u.availability.toLowerCase(),
      remote: u.remote,
      website: u.website,
      github: u.github,
      linkedin: u.linkedin,
      verified: u.verified,
      featured: u.featured,
      completedJobs: u.completedJobs,
      rating: u.rating,
      createdAt: u.createdAt,
    };
  }
}

function mapAvailability(v: string): Availability {
  if (v === 'busy') return Availability.BUSY;
  if (v === 'part-time') return Availability.PART_TIME;
  return Availability.AVAILABLE;
}