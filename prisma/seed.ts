import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const TONES = [
  { code: 'high', name: 'Haut', displaySymbol: '↑' },
  { code: 'neutral', name: 'Neutre', displaySymbol: '→' },
  { code: 'low', name: 'Bas', displaySymbol: '↓' },
] as const;

async function main() {
  for (const tone of TONES) {
    await prisma.tone.upsert({
      where: { code: tone.code },
      update: { name: tone.name, displaySymbol: tone.displaySymbol },
      create: tone,
    });
  }
  console.log('Seed des tons de référence terminé :', TONES.length, 'tons créés ou mis à jour.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
