import { connectDB, disconnectDB } from './config/db.js';
import env from './config/env.js';
import { User } from './models/User.js';

if (env.nodeEnv === 'production') {
  throw new Error('Demo seed is disabled in production. Create production users through the secured admin/onboarding flow.');
}

if (process.env.SEED_DEMO_USERS !== 'true') {
  throw new Error('Demo seed disabled. Set SEED_DEMO_USERS=true and provide SEED_*_PASSWORD values for local development only.');
}

const users = [
  { name: 'Master Admin', email: 'master@canteen.local', password: process.env.SEED_MASTER_PASSWORD, role: 'MASTER_ADMIN' },
  { name: 'Admin User', email: 'admin@canteen.local', password: process.env.SEED_ADMIN_PASSWORD, role: 'ADMIN' },
  { name: 'Staff User', email: 'staff@canteen.local', password: process.env.SEED_STAFF_PASSWORD, role: 'STAFF', department: 'Kitchen' },
  { name: 'Member User', email: 'member@canteen.local', password: process.env.SEED_MEMBER_PASSWORD, role: 'MEMBER' }
];

if (users.some((user) => !user.password)) {
  throw new Error('All SEED_*_PASSWORD values must be provided when SEED_DEMO_USERS=true.');
}

await connectDB();

for (const data of users) {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    console.log(`Exists: ${data.email}`);
    continue;
  }
  await User.create(data);
  console.log(`Created: ${data.email}`);
}

await disconnectDB();
