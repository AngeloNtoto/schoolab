import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { licenseId: string; schoolId: string };
    const { schoolId } = decoded;

    const data = await req.json();
    const { type, status, details, errorMessage, durationMs, timestamp } = data;

    // Verify school exists to avoid FK violation
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
        console.warn(`Sync log attempted for non-existent school: ${schoolId}`);
        return NextResponse.json({ success: false, error: 'School not found' }, { status: 404 });
    }

    const log = await (prisma as any).syncLog.create({
      data: {
        schoolId,
        type,
        status,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        errorMessage,
        durationMs,
        timestamp: timestamp ? new Date(timestamp) : undefined,
      },
    });

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error) {
    console.error('Error storing sync log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
