import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('POST /api/admin/schools - Request Body:', body);
    const { name, city, pobox, expiresAt, licenseKey } = body;

    if (!name || !city || !expiresAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a license key if not provided
    const finalKey = licenseKey || generateLicenseKey();

    // Create school and license in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name,
          city,
          pobox,
        }
      });

      const license = await tx.license.create({
        data: {
          key: finalKey,
          expiresAt: new Date(expiresAt),
          schoolId: school.id,
        }
      });

      console.log('Transaction result:', { school, license });
      return { school, license };
    });

    console.log('School created successfully:', result);

    if (!result || !result.school || !result.license) {
        console.error('Transaction returned invalid result:', result);
        return NextResponse.json({ error: 'Failed to create school record' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('School creation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, city, pobox, expiresAt } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing school ID' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.update({
        where: { id },
        data: {
          name,
          city,
          pobox,
        }
      });

      if (expiresAt) {
        await tx.license.update({
          where: { schoolId: id },
          data: {
            expiresAt: new Date(expiresAt)
          }
        });
      }

      return school;
    });

    console.log('School updated successfully:', result);

    if (!result) {
        console.error('Update transaction returned null result');
        return NextResponse.json({ error: 'Failed to update school record' }, { status: 500 });
    }

    return NextResponse.json({ success: true, school: result });
  } catch (error: any) {
    console.error('School update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

function generateLicenseKey() {
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(Math.random().toString(36).substring(2, 6).toUpperCase());
  }
  return parts.join('-');
}
