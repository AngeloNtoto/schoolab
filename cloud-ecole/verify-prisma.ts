
import { PrismaClient } from '@prisma/client';

async function main() {
  try {
    console.log('Attempting to instantiate PrismaClient...');
    const prisma = new PrismaClient();
    console.log('PrismaClient instantiated successfully.');
    await prisma.$disconnect();
    console.log('Verification passed.');
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

main();
