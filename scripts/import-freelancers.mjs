import { io } from 'socket.io-client';

const COUNT = 150;
const PASSWORD = 'password123';
const API = 'http://localhost:3001';

const FIRST = [
  'Yuki', 'Diego', 'Fatima', 'Erik', 'Ananya', 'Liam', 'Sofia', 'Kenji', 'Nadia', 'Marcus',
  'Ingrid', 'Chidi', 'Amara', 'Felix', 'Hana', 'Victor', 'Zara', 'Omar', 'Lina', 'Tomas',
  'Priyanka', 'Bruno', 'Sana', 'Noah', 'Isla', 'Karim', 'Maya', 'Anders', 'Camila', 'Hiro',
];
const LAST = [
  'Tanaka', 'Silva', 'Hassan', 'Lindqvist', 'Rao', 'Walsh', 'Fernandez', 'Okada', 'Aziz', 'Moreau',
  'Berger', 'Okafor', 'Diallo', 'Brandt', 'Sato', 'Vega', 'Abadi', 'Elia', 'Novak', 'Reyes',
];
const CATEGORIES = [
  'Web Development', 'Mobile Apps', 'UI/UX Design', 'Data & AI', 'DevOps & Cloud', 'WordPress & CMS',
];
const ROLES = {
  'Web Development': [
    'Full-Stack Developer', 'Frontend Engineer', 'Backend Engineer', 'React Developer', 'Next.js Developer',
    'Node.js Engineer', 'TypeScript Engineer', 'REST & GraphQL API Developer', 'Jamstack Developer', 'Web Application Architect',
  ],
  'Mobile Apps': [
    'Flutter Engineer', 'React Native Developer', 'Swift iOS Engineer', 'Kotlin Android Engineer', 'Mobile UI Developer',
    'Cross-Platform Developer', 'Unity Mobile Developer', 'App Security Engineer', 'Mobile Backend Developer', 'App Performance Engineer',
  ],
  'UI/UX Design': [
    'Product Designer', 'UI Designer', 'UX Researcher', 'Design Systems Specialist', 'Interaction Designer',
    'Mobile App Designer', 'Prototyping Specialist', 'Design Manager', 'Brand & UI Designer', 'Accessibility Designer',
  ],
  'Data & AI': [
    'Data Engineer', 'Machine Learning Engineer', 'Data Scientist', 'Data Analyst', 'NLP Engineer',
    'Computer Vision Engineer', 'BI Developer', 'ETL Specialist', 'MLOps Engineer', 'AI Product Engineer',
  ],
  'DevOps & Cloud': [
    'DevOps Engineer', 'Cloud Architect', 'AWS Specialist', 'Kubernetes Engineer', 'Site Reliability Engineer',
    'CI/CD Automation Engineer', 'Infrastructure Engineer', 'Cloud Security Engineer', 'Terraform Engineer', 'Platform Engineer',
  ],
  'WordPress & CMS': [
    'WordPress Developer', 'WP Theme Customizer', 'WooCommerce Developer', 'Headless CMS Developer', 'WP Performance Engineer',
    'Elementor Specialist', 'Shopify Developer', 'CMS Migration Engineer', 'WP Security Engineer', 'SEO & WordPress Expert',
  ],
};
const SENIORITY = ['Junior', 'Mid-level', 'Senior', 'Principal', 'Lead'];
const LOCATIONS = [
  'United States', 'United Kingdom', 'Canada', 'Germany', 'Netherlands', 'Spain', 'Portugal', 'Poland',
  'Brazil', 'India', 'Nigeria', 'Kenya', 'Japan', 'South Korea', 'Singapore', 'Australia', 'Mexico', 'Remote',
];
const BIOS = [
  (t, y) => `I'm a ${t} with ${y}+ years of hands-on experience. I focus on shipping clean, reliable work on time — clear communication, predictable timelines and no surprise budget overruns.`,
  (t, y) => `${y} years as a ${t}. I enjoy jumping into an existing codebase, untangling legacy code, and getting teams unstuck with pragmatic architecture decisions.`,
  (t, y) => `Working as a ${t} for ${y}+ years, I care about the details that make software feel professional: performance, accessibility, testing and clean workflows.`,
  (t, y) => `I'm a ${t} who turns fuzzy requirements into concrete deliverables — ${y} years in the field, a strong eye for quality, and enough process to keep things moving.`,
  (t, y) => `Reliable and communicative. As a ${t} with ${y} years of experience, I deliver work that's built to scale — and I treat every client project as if it were my own.`,
];
const catFloor = {
  'Web Development': 60, 'Mobile Apps': 70, 'UI/UX Design': 50,
  'Data & AI': 75, 'DevOps & Cloud': 70, 'WordPress & CMS': 45,
};

const pending = new Map();
function onResp(socket, cb) {
  socket.on('res', (r) => {
    const fn = pending.get(r.id);
    if (fn) { pending.delete(r.id); fn(r); }
  });
}
function req(socket, event, payload = {}, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    pending.set(id, (r) => (r.ok ? resolve(r.data) : reject(new Error(r.error))));
    socket.emit('req', { id, event, payload });
    setTimeout(() => { pending.delete(id); reject(new Error('timeout:' + event)); }, timeout);
  });
}
function connect(auth) {
  const socket = io(API, { transports: ['websocket'], auth: auth ? { token: auth } : {} });
  return new Promise((resolve, reject) => {
    socket.once('connect', () => { onResp(socket, null); resolve(socket); });
    socket.once('connect_error', reject);
  });
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function makeProfile(i) {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7 + 3) % LAST.length];
  const name = `${first} ${last}`;
  const email = `${slug(first)}.${slug(last)}${i}@codespan.dev`;
  const category = CATEGORIES[i % CATEGORIES.length];
  const roles = ROLES[category];
  const role = roles[Math.floor(i / CATEGORIES.length) % roles.length];
  const title = `${SENIORITY[(i + Math.floor(i / CATEGORIES.length)) % SENIORITY.length]} ${role}`;
  const years = 2 + ((i * 13) % 21);
  return {
    name, email, category, title, years,
    data: {
      title,
      bio: BIOS[i % BIOS.length](title, years),
      category,
      skills: [],
      hourlyRate: catFloor[category] + ((i * 7) % (i % 4 === 0 ? 90 : 55)),
      experienceYears: years,
      location: LOCATIONS[(i * 5 + 2) % LOCATIONS.length],
      availability: ['available', 'part-time', 'busy'][i % 3],
      remote: i % 9 === 0 ? 'no' : 'yes',
      website: `https://${slug(first)}.codespan.dev`,
      github: `https://github.com/${slug(first)}${i}`,
      linkedin: `https://linkedin.com/in/${slug(name)}`,
    },
  };
}

let created = 0, skipped = 0, failed = 0;

const pub = await connect();
console.log(`Connected to ${API} — importing ${COUNT} freelancers via WebSocket API...`);

for (let i = 0; i < COUNT; i++) {
  const p = makeProfile(i);
  try {
    const reg = await req(pub, 'auth:register', {
      name: p.name, email: p.email, password: PASSWORD, role: 'freelancer',
    });
    const authed = await connect(reg.token);
    try {
      await req(authed, 'profile:update', { data: p.data });
    } finally {
      authed.disconnect();
    }
    created++;
    process.stdout.write(`\r  ${i + 1}/${COUNT} ok (${p.title})`);
  } catch (e) {
    if (e.message.includes('already exists')) {
      skipped++;
      process.stdout.write(`\r  ${i + 1}/${COUNT} skip (exists)`);
    } else {
      failed++;
      console.error(`\n  FAIL ${i}: ${p.email} -> ${e.message}`);
    }
  }
}
pub.disconnect();

console.log(`\nDone: ${created} created, ${skipped} skipped (already existed), ${failed} failed.`);

const check = io(API, { transports: ['websocket'] });
const waitConn = (s) => new Promise((r) => s.once('connect', r));
check.on('res', (r) => { const fn = pending.get(r.id); if (fn) { pending.delete(r.id); fn(r); } });
await waitConn(check);
const list = await req(check, 'freelancers:list', {});
const skills = await req(check, 'freelancers:list', { skill: 'React Developer' });
const jobCount = await req(check, 'jobs:list', {}).then((j) => j.length).catch(() => 0);
console.log(`Total freelancers in DB: ${list.length} | 'React Developer' matches: ${skills.length} | open jobs: ${jobCount}`);
check.disconnect();
process.exit(failed ? 1 : 0);