"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("./prisma.service");
const client_1 = require("@prisma/client");
const EDITABLE = [
    'title', 'bio', 'category', 'skills', 'hourlyRate', 'experienceYears',
    'location', 'availability', 'remote', 'website', 'github', 'linkedin',
];
let AuthService = class AuthService {
    prisma;
    jwt;
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async register(dto) {
        const name = (dto.name || '').trim();
        const email = (dto.email || '').trim().toLowerCase();
        const role = dto.role === 'freelancer' ? client_1.Role.FREELANCER : client_1.Role.CLIENT;
        if (!name)
            throw new common_1.BadRequestException('Name is required');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
            throw new common_1.BadRequestException('A valid email is required');
        if (!dto.password || dto.password.length < 6)
            throw new common_1.BadRequestException('Password must be at least 6 characters');
        const exists = await this.prisma.user.findUnique({ where: { email } });
        if (exists)
            throw new common_1.ConflictException('An account with that email already exists');
        const user = await this.prisma.user.create({
            data: {
                name, email, role,
                passwordHash: await bcrypt.hash(dto.password, 10),
                avatarHue: Math.floor(Math.random() * 360),
            },
        });
        return this.issue(user);
    }
    async login(dto) {
        const email = (dto.email || '').trim().toLowerCase();
        if (!email || !dto.password)
            throw new common_1.UnauthorizedException('Email and password are required');
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const ok = await bcrypt.compare(dto.password, user.passwordHash);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid email or password');
        return this.issue(user);
    }
    async me(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return this.publicUser(user);
    }
    async updateProfile(userId, id, dto) {
        if (userId !== id)
            throw new common_1.UnauthorizedException('You can only edit your own profile');
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const data = {};
        for (const key of EDITABLE) {
            if (dto[key] !== undefined)
                data[key] = dto[key];
        }
        if (data.skills !== undefined && !Array.isArray(data.skills)) {
            data.skills = String(data.skills).split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (data.availability !== undefined && typeof data.availability === 'string') {
            data.availability = mapAvailability(data.availability);
        }
        const updated = await this.prisma.user.update({ where: { id }, data });
        return this.publicUser(updated);
    }
    issue(user) {
        const payload = { sub: user.id, role: user.role };
        const token = this.jwt.sign(payload);
        return { token, user: this.publicUser(user) };
    }
    publicUser(u) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
function mapAvailability(v) {
    if (v === 'busy')
        return client_1.Availability.BUSY;
    if (v === 'part-time')
        return client_1.Availability.PART_TIME;
    return client_1.Availability.AVAILABLE;
}
