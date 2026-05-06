import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  const email = 'test@gmail.com';
  const password = 'test123';
  const username = 'testuser';

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      username,
      passwordHash,
      fullName: 'Test User',
    },
  });

  console.log(`✓ Seed user ready: id=${user.id}  email=${user.email}  username=${user.username}`);
  console.log(`  password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
