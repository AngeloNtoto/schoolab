import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ success: false, error: 'Missing schoolId' }, { status: 400 });
    }

    // Security: Check if token belongs to this school
    if (decoded.schoolId !== schoolId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Token mismatch' }, { status: 403 });
    }

    const sinceParam = searchParams.get('since');
    const sinceDate = sinceParam ? new Date(sinceParam) : undefined;

    // Verify machine authorization
    const hwid = request.headers.get('X-HWID');
    if (!hwid) {
      return NextResponse.json({ success: false, error: 'Missing HWID header' }, { status: 400 });
    }

    const license = await prisma.license.findUnique({
      where: { schoolId }
    });

    if (!license || !license.hwids.includes(hwid)) {
      return NextResponse.json({ success: false, error: 'Machine not authorized or no license found' }, { status: 403 });
    }

    // Define filter base
    const baseFilter = { schoolId };
    const filter = sinceDate 
      ? { ...baseFilter, lastModifiedAt: { gt: sinceDate } }
      : baseFilter;

    // Special handling for Student: check updatedAt OR class filtered
    // But simplified: just check student.updatedAt > sinceDate
    // Also include class connection check if needed, but here we just want modified students.
    // The original query had `classId: { not: null }`. We should keep that constraint if it sets validity
    // but usually sync should return ALL valid data.
    const studentFilter = {
      ...filter,
      classId: { not: null }
    };

    // Fetch all relevant data for the school with related localIds
    const [academicYears, classes, domains, students, subjects, grades, notes, deletions, school] = await Promise.all([
      prisma.academicYear.findMany({ where: filter }),
      prisma.class.findMany({ 
        where: filter,
        include: { academicYear: { select: { localId: true } } }
      }),
      prisma.domain.findMany({ where: filter }),
      prisma.student.findMany({ 
        where: studentFilter,
        include: { class: { select: { localId: true } } }
      }),
      prisma.subject.findMany({ 
        where: filter,
        include: { 
          class: { select: { localId: true } },
          domain: { select: { localId: true } }
        }
      }),
      prisma.grade.findMany({ 
        where: filter,
        include: { 
          student: { select: { localId: true } },
          subject: { select: { localId: true } }
        }
      }),
      prisma.note.findMany({ 
        where: filter,
        include: { academicYear: { select: { localId: true } } }
      }),
      prisma.deletedRecord.findMany({
        where: sinceDate 
          ? { schoolId, deletedAt: { gt: sinceDate } }
          : { schoolId },
        select: { tableName: true, localId: true }
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, city: true, pobox: true }
      })
    ]);

    // Format data for client (flattening relations to local IDs)
    const formattedData = {
      academicYears,
      classes: classes.map(c => ({ ...c, academicYearLocalId: c.academicYear?.localId })),
      domains,
      students: students.map(s => ({ ...s, classLocalId: s.class?.localId })),
      subjects: subjects.map(s => ({ ...s, classLocalId: s.class?.localId, domainLocalId: s.domain?.localId })),
      grades: grades.map(g => ({ ...g, studentLocalId: g.student?.localId, subjectLocalId: g.subject?.localId })),
      notes: notes.map(n => ({ ...n, academicYearLocalId: n.academicYear?.localId })),
      deletions,
      school: school
    };

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      data: formattedData
    });

  } catch (error: any) {
    console.error('Sync pull error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
