require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Subscription = require('./models/Subscription');
const Setting = require('./models/Setting');

const INITIAL_USERS = [
  {
    name: 'Su Hnin Phway',
    email: 'suhnin.phway@kbzbank.com',
    password: 'admin123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'
  },
  {
    name: 'Sarah Admin',
    email: 'admin@creativehub.com',
    password: 'admin123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
  },
  {
    name: 'Alex Viewer',
    email: 'user@creativehub.com',
    password: 'user123',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  }
];

const INITIAL_SUBSCRIPTIONS = [
  {
    product: 'Magnific',
    tool: 'AI + Photo Download',
    plan: 'Yearly',
    status: 'Inactive',
    start: '2026-08-19',
    expiry: '',
    cost: '',
    email: 'creative.team1010@gmail.com',
    reminderEmail: '',
    alertDays: 7,
    initialTokens: '',
    purchaseNote: '',
    archived: false
  },
  {
    product: 'Magnific',
    tool: 'AI + Photo Download',
    plan: 'Yearly',
    status: 'Inactive',
    start: '2026-08-19',
    expiry: '',
    cost: '',
    email: 'creative.team.kbz999@gmail.com',
    reminderEmail: '',
    alertDays: 7,
    initialTokens: '',
    purchaseNote: '',
    archived: false
  },
  {
    product: 'ChatGPT',
    tool: 'AI + Content Creation',
    plan: 'Monthly',
    status: 'Active',
    start: '2026-08-19',
    expiry: '2026-09-19',
    cost: '24',
    email: 'creative.team.kbz111@gmail.com',
    reminderEmail: '',
    alertDays: 7,
    initialTokens: '',
    purchaseNote: '',
    archived: false
  }
];

async function seedDatabase() {
  await connectDB();
  console.log('[Seed] Checking initial database state...');

  // 1. Seed Users if empty
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('[Seed] Seeding initial admin and demo user accounts...');
    for (const u of INITIAL_USERS) {
      await User.create(u);
    }
    console.log('[Seed] Users seeded successfully.');
  } else {
    console.log(`[Seed] Database already has ${userCount} user(s).`);
  }

  // 2. Seed Subscriptions if empty
  const subCount = await Subscription.countDocuments();
  if (subCount === 0) {
    console.log('[Seed] Seeding initial creative subscriptions...');
    const adminUser = await User.findOne({ role: 'admin' });
    const docs = INITIAL_SUBSCRIPTIONS.map((s) => ({
      ...s,
      createdBy: adminUser?._id
    }));
    await Subscription.insertMany(docs);
    console.log('[Seed] Subscriptions seeded successfully.');
  } else {
    console.log(`[Seed] Database already has ${subCount} subscription(s).`);
  }

  // 3. Ensure Settings exist
  await Setting.findOneAndUpdate(
    { key: 'dashboard_config' },
    { reportMonth: '2026-08' },
    { upsert: true, new: true }
  );

  console.log('[Seed] Database initialization complete.');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}

module.exports = seedDatabase;
