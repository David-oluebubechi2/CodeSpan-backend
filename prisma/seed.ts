import 'dotenv/config';
import { PrismaClient, Role, Availability } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'password123';

const CATEGORIES = [
  'Web Development',
  'Mobile Apps',
  'UI/UX Design',
  'Data & AI',
  'DevOps & Cloud',
  'WordPress & CMS',
] as const;

const SENIORITY = ['Junior', 'Mid-level', 'Senior', 'Lead', 'Principal'];

const ROLES: Record<string, string[]> = {
  'Web Development': [
    'Full-Stack Developer',
    'Frontend Engineer',
    'Backend Developer',
    'React Developer',
    'Next.js Developer',
    'Node.js Engineer',
    'TypeScript Engineer',
    'REST & GraphQL API Developer',
    'Jamstack Developer',
    'Web Application Architect',
  ],
  'Mobile Apps': [
    'Flutter Engineer',
    'React Native Developer',
    'iOS Engineer',
    'Android Developer',
    'Swift Developer',
    'Kotlin Developer',
    'Cross-platform App Developer',
    'Mobile App Architect',
    'Mobile UX Engineer',
    'App Store Optimization Specialist',
  ],
  'UI/UX Design': [
    'Product Designer',
    'UI/UX Designer',
    'Brand & Identity Designer',
    'Interaction Designer',
    'Design Systems Lead',
    'Web & Mobile Designer',
    'Figma Specialist',
    'UX Researcher',
    'Motion & Micro-interaction Designer',
    'Design Operations Specialist',
  ],
  'Data & AI': [
    'Data Scientist',
    'Machine Learning Engineer',
    'Data Engineer',
    'AI Engineer',
    'NLP Specialist',
    'Computer Vision Engineer',
    'BI & Analytics Developer',
    'MLOps Engineer',
    'Big Data Architect',
    'Predictive Modeling Specialist',
  ],
  'DevOps & Cloud': [
    'DevOps Engineer',
    'Cloud Architect',
    'Site Reliability Engineer',
    'Platform Engineer',
    'Infrastructure Engineer',
    'Kubernetes Specialist',
    'CI/CD Pipeline Engineer',
    'Cloud Security Engineer',
    'Database Administrator',
    'Observability Engineer',
  ],
  'WordPress & CMS': [
    'WordPress Developer',
    'WooCommerce Expert',
    'Shopify Developer',
    'Headless CMS Engineer',
    'PHP Developer',
    'E-commerce Specialist',
    'CMS Migration Expert',
    'WordPress Performance Engineer',
    'Headless Commerce Developer',
    'Plugin & Theme Developer',
  ],
};

const FIRST = [
  'Amina', 'Diego', 'Sana', 'Marcus', 'Elena', 'Tom', 'Priya', 'Oliver', 'Lucas', 'Maya', 'Ravi', 'Hannah',
  'Ethan', 'Sofia', 'Kofi', 'Yuki', 'Ingrid', 'Omar', 'Chloe', 'Mateo', 'Aisha', 'Noah', 'Freya', 'Arjun',
  'Isabella', 'Leon', 'Nina', 'Jonas', 'Fatima', 'Tara', 'Mila', 'Hiro', 'Amara', 'Felix', 'Zara', 'Ibrahim',
  'Nadia', 'Viktor', 'Camille', 'Rafael', 'Selma', 'Tobias', 'Ines', 'David', 'Aya', 'Milan', 'Greta', 'Kwame',
  'Anika', 'Bruno', 'Leila', 'Daniel', 'Rowan', 'Sara', 'Emre', 'Julia', 'Niko', 'Rosa', 'Elif', 'Adrian',
];

const LAST = [
  'Okafor', 'Ramírez', 'Ahmed', 'Chen', 'Petrova', 'Becker', 'Sharma', 'Grant', 'Silva', 'Kowalski', 'Patel',
  'Müller', 'Rossi', 'Kim', 'Novak', 'Costa', 'Osei', 'Tanaka', 'Hansen', 'Al-Farsi', 'Dubois', 'Carter',
  'Castillo', 'Nguyen', 'Kaur', 'Vidal', 'Berg', 'Ito', 'Marcos', 'Weber', 'Andersson', 'Zhao', 'Bakker',
  'Moreau', 'Rivera', 'Klein', 'Dumont', 'Olsen', 'Harper', 'Nakamura', 'Svensson', 'Marin', 'Fischer',
  'Walker', 'Santos', 'Larsen', 'Murphy', 'Rodrigues', 'Okafor', 'Van Dijk', 'Ferrari', 'Mendoza', 'Cruz',
];

const LOCATIONS = [
  'Lisbon', 'Berlin', 'London', 'Amsterdam', 'Warsaw', 'Singapore', 'Bengaluru', 'Mexico City',
  'New York', 'San Francisco', 'Toronto', 'Sydney', 'Tokyo', 'Paris', 'Stockholm', 'Dublin',
  'Madrid', 'Barcelona', 'Cape Town', 'Lagos', 'Nairobi', 'São Paulo', 'Dubai', 'Riga',
];

const CATEGORY_RATE_FLOOR: Record<string, number> = {
  'Web Development': 45,
  'Mobile Apps': 55,
  'UI/UX Design': 40,
  'Data & AI': 75,
  'DevOps & Cloud': 70,
  'WordPress & CMS': 35,
};

const BIO_TEMPLATES = [
  (t: string, y: number) =>
    `I'm a ${t} with ${y}+ years of hands-on experience. I focus on shipping clean, reliable work on time — clear communication, predictable timelines and no surprise budget overruns. I've led projects from first sketch to production across startups, agencies and enterprise teams.`,
  (t: string, y: number) =>
    `${y} years as a ${t}. I enjoy jumping into an existing codebase, untangling legacy code, and getting teams unstuck. Expect pragmatic architecture decisions, documented handovers and a bias for shipping.`,
  (t: string, y: number) =>
    `Working as a ${t} for ${y}+ years, I care about the details that make software feel professional: performance, accessibility, testing and clean workflows. I work independently and keep clients updated at every milestone.`,
  (t: string, y: number) =>
    `I'm a ${t} who turns fuzzy requirements into concrete deliverables. ${y} years in the field, a strong eye for quality, and enough process to keep things moving without slowing anyone down.`,
  (t: string, y: number) =>
    `Reliable and communicative. As a ${t} with ${y} years of experience, I deliver work that's built to scale — and I treat every client project as if it were my own product.`,
];

const CLIENTS = [
  { name: 'Laura Bennett', email: 'laura@acmestudio.io', hue: 200, company: 'Acme Studio' },
  { name: 'James Walker', email: 'james@northpeak.com', hue: 120, company: 'Northpeak' },
  { name: 'Marta Kovács', email: 'marta@flowtable.com', hue: 40, company: 'Flowtable' },
  { name: 'Peter OConnor', email: 'peter@brightmile.com', hue: 80, company: 'Brightmile' },
  { name: 'Amir Haddad', email: 'amir@verticell.com', hue: 300, company: 'Verticell' },
  { name: 'Grace Liu', email: 'grace@hummingco.com', hue: 160, company: 'Humming Co.' },
  { name: 'Samuel Adeyemi', email: 'samuel@ketera.io', hue: 250, company: 'Ketera' },
  { name: 'Nora Ibsen', email: 'nora@fjordworks.com', hue: 10, company: 'Fjord Works' },
  { name: 'Lucas Moreau', email: 'lucas@arcadia.io', hue: 130, company: 'Arcadia' },
  { name: 'Priya Menon', email: 'priya@solvent.co', hue: 340, company: 'Solvent' },
];

const FIXED_JOBS = [
  {
    title: 'Rebuild our SaaS marketing site with Next.js',
    description:
      'We are relaunching our analytics platform and need a performant marketing site with a blog, pricing page and docs. You will work from Figma designs and should have strong opinions about Core Web Vitals and SEO. Deliverables include a deployable repo on Vercel and CMS hooks for the blog.',
    category: 'Web Development',
    skills: ['Next.js', 'React', 'Tailwind CSS', 'SEO', 'Vercel'],
    budgetMin: 4000,
    budgetMax: 6500,
    duration: '2 – 4 weeks',
    location: 'Remote',
    remote: true,
    senior: 'senior',
  },
  {
    title: 'Cross-platform mobile app for a fitness startup',
    description:
      'We need a Flutter app with workout plans, progress tracking and push notifications, connected to our existing REST API. Should target both stores with full CI. We already have the design system in Figma and a clear roadmap.',
    category: 'Mobile Apps',
    skills: ['Flutter', 'Firebase', 'REST API'],
    budgetMin: 8000,
    budgetMax: 12000,
    duration: '1 – 3 months',
    location: 'Remote',
    remote: true,
    senior: 'senior',
  },
  {
    title: 'Design a fintech dashboard UI kit',
    description:
      'Help us design a clean, accessible dashboard UI kit for an expense-tracking fintech: tables, charts, forms, empty states and a tokens file. You will hand over a fully-organised Figma library with usage documentation.',
    category: 'UI/UX Design',
    skills: ['Figma', 'Design Systems', 'UI Design'],
    budgetMin: 2500,
    budgetMax: 3500,
    duration: '1 – 2 weeks',
    location: 'Remote',
    remote: true,
    senior: 'mid',
  },
  {
    title: 'Build a booking engine with real-time availability',
    description:
      'We run boutique hotels and need a booking engine: live availability, payments via Stripe, and an admin dashboard. Node.js + Postgres backend, React frontend. Real-time availability sync across the two front ends is key.',
    category: 'Web Development',
    skills: ['Node.js', 'React', 'PostgreSQL', 'Stripe', 'WebSocket'],
    budgetMin: 6000,
    budgetMax: 9000,
    duration: '1 – 3 months',
    location: 'Remote',
    remote: true,
    senior: 'senior',
  },
  {
    title: 'Set up Kubernetes cluster + CI/CD for our web app',
    description:
      'We want to move our deployment to Kubernetes on AWS with GitOps. Scope: cluster setup, Terraform modules, ArgoCD pipelines, secrets management and a runbook. You should be comfortable owning production infrastructure.',
    category: 'DevOps & Cloud',
    skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD'],
    budgetMin: 5000,
    budgetMax: 7500,
    duration: '2 – 4 weeks',
    location: 'Remote',
    remote: true,
    senior: 'senior',
  },
  {
    title: 'WooCommerce migration + speed optimization',
    description:
      'Migrate our store from Shopify to WooCommerce and cut page load times by 60%+. Scope includes data migration, caching layer, audit of the checkout flow and a handover document for our team.',
    category: 'WordPress & CMS',
    skills: ['WordPress', 'WooCommerce', 'PHP', 'Performance'],
    budgetMin: 1800,
    budgetMax: 3000,
    duration: '1 – 2 weeks',
    location: 'On-site Amsterdam',
    remote: false,
    senior: 'mid',
  },
];

const JOB_TEMPLATES = [
  {
    title: 'Launch a production-ready {role} for our team',
    description:
      'We have a spec, a timeline and a dedicated budget. We are looking for an experienced {roleLower} to own delivery end to end: scoping, implementation, testing and a clean handover with documentation. Full product background provided. Weekly demos to keep everyone aligned.',
  },
  {
    title: 'Fix performance bottlenecks in our {catLower} stack',
    description:
      'Our recent growth has exposed some slow paths. We need a {roleLower} who can profile, diagnose and fix the biggest offenders — infrastructure, queries, assets and runtime — and add meaningful regression checks so they stay fixed.',
  },
  {
    title: 'Ongoing maintenance partnership for {stage} project',
    description:
      'We are building a long-term relationship with a reliable {roleLower} for weekly maintenance: small features, dependency upgrades, security patches and the occasional fire drill. Flexible hours, consistent weekly volume.',
  },
  {
    title: 'Migrate and modernize our legacy system',
    description:
      'Our core system runs on an older stack and needs a careful migration to a modern architecture with minimal downtime. A {roleLower} with experience migrating production systems while keeping data safe is exactly who we need.',
  },
];

const REQUESTS = [
  {
    title: 'Landing page with booking form',
    description:
      'I need a single-page site for my yoga studio with a booking form and Google Calendar integration. A clean, calm design and a fast mobile experience would be ideal. Flexible on budget.',
    budget: 1200,
  },
  {
    title: 'Help with our React Native app',
    description:
      'Our app crashes on older Android devices and the navigation feels janky. Could you take a look and fix the worst offenders? We can share crash logs and a repro list right away.',
    budget: 2000,
  },
  {
    title: 'Design refresh for our onboarding flow',
    description:
      'Our new-user onboarding has too many drop-offs. We would like a UX review plus a redesigned flow in Figma, with a focus on reducing friction. Dev-ready specs and a short validation plan included.',
    budget: 900,
  },
  {
    title: 'Bottle-neck in our reporting pipeline',
    description:
      'Our nightly reports take 6+ hours to run. We need someone to help redesign the pipeline, add proper partitioning and cut the run-time dramatically. We are on AWS and open to restructuring.',
    budget: 3500,
  },
];

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
}

function buildFreelancer(i: number, passwordHash: string) {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7 + 3) % LAST.length];
  const name = `${first} ${last}`;
  const email = `${slug(first)}.${slug(last)}${i}@codespan.dev`;
  const category = CATEGORIES[i % CATEGORIES.length] as keyof typeof ROLES;
  const roles = ROLES[category];
  const seniority = SENIORITY[(i + Math.floor(i / CATEGORIES.length)) % SENIORITY.length];
  const title = `${seniority} ${roles[Math.floor(i / CATEGORIES.length) % roles.length]}`;
  const years = 2 + ((i * 13) % 21);
  const floor = CATEGORY_RATE_FLOOR[category];
  const rate = floor + ((i * 7) % (i % 4 === 0 ? 90 : 55));

  return {
    name,
    email,
    passwordHash,
    role: Role.FREELANCER,
    avatarHue: (i * 47) % 360,
    title,
    bio: BIO_TEMPLATES[i % BIO_TEMPLATES.length](title, years),
    category,
    skills: [],
    hourlyRate: rate,
    experienceYears: years,
    location: LOCATIONS[(i * 5 + 2) % LOCATIONS.length],
    remote: i % 9 === 0 ? 'no' : 'yes',
    availability: [Availability.AVAILABLE, Availability.PART_TIME, Availability.BUSY][i % 3],
    verified: i % 3 !== 0,
    featured: i % 10 === 0,
    rating: Number((4.2 + ((i * 11) % 8) / 10).toFixed(1)),
    completedJobs: 6 + ((i * 17) % 70),
    github: `https://github.com/${slug(first)}${i}`,
    linkedin: `https://linkedin.com/in/${slug(name)}`,
    website: `https://${slug(first)}.codespan.dev`,
  };
}

async function main() {
  await prisma.application.deleteMany({});
  await prisma.projectRequest.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const FREELANCER_COUNT = 120;
  const freelancerData = Array.from({ length: FREELANCER_COUNT }, (_, i) =>
    buildFreelancer(i, passwordHash),
  );
  await prisma.user.createMany({ data: freelancerData });

  const clientData = CLIENTS.map((c) => ({
    name: c.name,
    email: c.email,
    passwordHash,
    role: Role.CLIENT,
    avatarHue: c.hue,
    title: `Founder, ${c.company}`,
    verified: true,
    location: 'United States',
    website: `https://${c.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
  }));
  await prisma.user.createMany({ data: clientData });

  const freelancers = await prisma.user.findMany({ where: { role: Role.FREELANCER } });
  const clients = await prisma.user.findMany({ where: { role: Role.CLIENT } });

  const createdJobs = [];

  for (const j of [...FIXED_JOBS, ...FIXED_JOBS.slice(0, 3)]) {
    const owner = clients[(createdJobs.length * 3 + 1) % clients.length];
    const created = await prisma.job.create({
      data: {
        ownerId: owner.id,
        title: j.title,
        description: j.description,
        category: j.category,
        skills: j.skills,
        budgetMin: j.budgetMin,
        budgetMax: j.budgetMax,
        duration: j.duration,
        location: j.location,
        remote: j.remote,
      },
    });
    createdJobs.push(created);
  }

  const catList = CATEGORIES as readonly string[];
  for (let k = 0; k < 22; k++) {
    const category = catList[k % catList.length];
    const roles = ROLES[category];
    const role = roles[(k * 3 + 1) % roles.length];
    const template = JOB_TEMPLATES[k % JOB_TEMPLATES.length];
    const owner = clients[(k * 5 + 2) % clients.length];
    const budget = 1500 + ((k * 1900) % 15000);
    const created = await prisma.job.create({
      data: {
        ownerId: owner.id,
        title: template.title
          .replace('{role}', role.replace('Senior ', '').replace('Lead ', ''))
          .replace(/\{roleLower\}/g, role.toLowerCase())
          .replace(/\{catLower\}/g, category.toLowerCase())
          .replace('{stage}', k % 2 === 0 ? 'our flagship' : 'our mobile'),
        description: template.description
          .replaceAll('{roleLower}', role.toLowerCase())
          .replaceAll('{catLower}', category.toLowerCase()),
        category,
        skills: roles.slice(0, 3),
        budgetMin: budget,
        budgetMax: budget + 1500 + (k % 3) * 1000,
        duration: ['1 – 2 weeks', '2 – 4 weeks', '1 – 3 months'][k % 3],
        location: k % 4 === 0 ? 'Remote' : LOCATIONS[(k * 7 + 4) % LOCATIONS.length],
        remote: k % 5 !== 0,
      },
    });
    createdJobs.push(created);
  }

  const applyPairs = [
    [createdJobs[0], freelancers[6], 1, 'Have shipped three marketing sites that score 95+ on PageSpeed. I would love to help rebuild yours — happy to jump on a call this week.'],
    [createdJobs[3], freelancers[7], 1, 'Real-time booking over WebSocket is exactly my specialty — I have built a similar system for a car-rental startup and can share relevant code samples right away.'],
    [createdJobs[1], freelancers[2], 1, 'I have released several apps to both stores with crash-free rates above 99.5%. Your roadmap looks like a great fit for my skills.'],
    [createdJobs[4], freelancers[4], 1, 'I have been running Kubernetes in production for 6+ years, including GitOps rollouts at scale. I would be glad to own this end to end.'],
  ];
  for (const [job, freelancer, count, letter] of applyPairs as any[]) {
    for (let n = 0; n < count; n++) {
      await prisma.application.create({
        data: { jobId: job.id, freelancerId: freelancer.id, coverLetter: letter },
      });
    }
  }

  const requestPairs: Array<[number, number]> = [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
  ];
  for (const [ci, fi] of requestPairs) {
    const req = REQUESTS[ci % REQUESTS.length];
    await prisma.projectRequest.create({
      data: {
        clientId: clients[ci % clients.length].id,
        freelancerId: freelancers[fi % freelancers.length].id,
        title: req.title,
        description: req.description,
        budget: req.budget,
      },
    });
  }

  console.log(
    `Seeded: ${FREELANCER_COUNT} freelancers, ${clients.length} clients, ${createdJobs.length} jobs, applications & requests. Password for all: ${PASSWORD}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());