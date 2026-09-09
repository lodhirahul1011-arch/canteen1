import { connectDB, disconnectDB } from './config/db.js';
import { Category } from './models/Category.js';
import { User } from './models/User.js';

const users = [
  { name: 'Master Admin', email: 'master@canteen.local', password: 'Master@12345', role: 'MASTER_ADMIN' },
  { name: 'Admin User', email: 'admin@canteen.local', password: 'Admin@12345', role: 'ADMIN' },
  { name: 'Staff User', email: 'staff@canteen.local', password: 'Staff@12345', role: 'STAFF', department: 'Kitchen' },
  { name: 'Member User', email: 'member@canteen.local', password: 'Member@12345', role: 'MEMBER' }
];

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

const categories = [
  { name: 'Breakfast', description: 'Morning meals and snacks' },
  { name: 'Main Course', description: 'Meals and filling dishes' },
  { name: 'Beverages', description: 'Hot and cold drinks' },
  { name: 'Snacks', description: 'Quick bites and sides' }
];

for (const data of categories) {
  const existing = await Category.findOne({ name: data.name });
  if (existing) {
    console.log(`Exists: ${data.name}`);
    continue;
  }
  await Category.create(data);
  console.log(`Created: ${data.name}`);
}

await disconnectDB();
