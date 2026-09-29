import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function main() {
  const email = 'admin@thenewera.space';
  const password = 'ChangeMe_2026!';

  const passwordHash = hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Admin account created successfully.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });