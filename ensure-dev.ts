import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'dev@codespan.dev' },
    create: {
      email: 'dev@codespan.dev',
      name: 'Dev Admin',
      passwordHash,
      role: Role.FREELANCER,
      avatarHue: 210,
      title: 'Senior Full-Stack Developer',
      category: 'Web Development',
      hourlyRate: 120,
      experienceYears: 10,
      location: 'Remote',
      remote: 'yes',
      verified: true,
      featured: true,
      rating: 4.9,
      completedJobs: 55,
    },
    update: {},
  });
  console.log('Upserted dev@codespan.dev (password: password123)');
  await prisma.$disconnect();
}

main();