import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = 'angelontoto7@gmail.com'
  const rawPassword = 'angelontoto7'
  const hashedPassword = await bcrypt.hash(rawPassword, 10)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
    },
    create: {
      email,
      name: 'Administrateur',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin créé ou déjà existant :', admin.email)

  // Création d'une école de test
  const school = await prisma.school.upsert({
    where: { id: 'test-school-id' },
    update: {},
    create: {
      id: 'test-school-id',
      name: 'Institut Lumumba',
      city: 'Kinshasa',
    }
  })

  console.log('✅ École de test créée :', school.name)

  // Création d'une licence pour cette école
  const license = await prisma.license.upsert({
    where: { key: 'AAAA-BBBB-CCCC-DDDD' },
    update: {},
    create: {
      key: 'AAAA-BBBB-CCCC-DDDD',
      expiresAt: new Date('2027-01-01'),
      schoolId: school.id,
      active: false
    }
  })

  console.log('✅ Licence de test créée :', license.key)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
