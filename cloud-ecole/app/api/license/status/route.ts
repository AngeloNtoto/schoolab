import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId || decoded.schoolId !== schoolId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const license = await prisma.license.findUnique({
      where: { schoolId }
    });

    if (!license) {
      return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 });
    }

    // Optional: Check if the requesting machine is authorized
    const hwid = request.headers.get('X-HWID');
    if (hwid && !license.hwids.includes(hwid)) {
      return NextResponse.json({ success: false, error: 'Machine not authorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      license: {
        active: license.active,
        expiresAt: license.expiresAt,
        key: license.key
      }
    });

  } catch (error: any) {
    console.error('License status error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
