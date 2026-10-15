const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const [users, clients, workspaces, verifiedUsers] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.workspace.count(),
    prisma.user.count({ where: { verifiedAt: { not: null } } }),
  ]);

  console.log('\n--- NEW ERA DATABASE CHECK ---');
  console.log('İstifadəçilər:', users);
  console.log('Müştəri profilləri:', clients);
  console.log('Workspace-lər:', workspaces);
  console.log('E-poçtu təsdiqlənmiş istifadəçilər:', verifiedUsers);
}

main()
  .catch((error) => {
    console.error('Yoxlama xətası:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
