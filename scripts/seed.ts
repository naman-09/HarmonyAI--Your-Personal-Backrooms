import { db, users } from '../src/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  const email = 'naman@harmony.com';
  const password = 'test@1234';

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    console.log(`Owner account ${email} already exists.`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await db.insert(users).values({
    email,
    password: hashedPassword,
    name: 'Naman',
    isActive: true,
  });

  console.log(`Created permanent owner account: ${email}`);
}

seed().catch((err) => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
