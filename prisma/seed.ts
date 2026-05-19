import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PAP_ALPHA_INVITE_EMAIL;

  if (!email) {
    console.log('PAP_ALPHA_INVITE_EMAIL not set; skipping alpha invite seed.');
    return;
  }

  await prisma.alphaInvite.upsert({
    where: { email: email.trim().toLowerCase() },
    update: { status: 'invited' },
    create: { email: email.trim().toLowerCase(), status: 'invited' },
  });

  console.log(`Seeded private alpha invite for ${email.trim().toLowerCase()}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
