import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

const normalizeBool = (val: any) => !!val;

interface DeletionResult {
  localId: any;
  tableName: string;
  success: boolean;
}

interface SyncResult {
  localId: any;
  serverId: string;
}

export async function POST(request: Request) {
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

    const { schoolId, data, schoolInfo } = await request.json();

    if (!schoolId || !data) {
      return NextResponse.json({ success: false, error: 'Missing schoolId or data' }, { status: 400 });
    }

    // Security: Check if token belongs to this school
    if (decoded.schoolId !== schoolId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Token mismatch' }, { status: 403 });
    }

    // Verify machine authorization
    const hwid = request.headers.get('X-HWID');
    if (!hwid) {
      return NextResponse.json({ success: false, error: 'Missing HWID header' }, { status: 400 });
    }

    const license = await prisma.license.findUnique({
      where: { schoolId }
    });

    const hwids = (license as any)?.hwids as string[] || [];
    const isAuthorized = hwids.some(h => h.toLowerCase() === hwid.toLowerCase());

    if (!license || !isAuthorized) {
      return NextResponse.json({ success: false, error: 'Machine not authorized or no license found' }, { status: 403 });
    }

    // 0. Update School Info if provided
    if (schoolInfo) {
      await prisma.school.update({
        where: { id: schoolId },
        data: {
          name: schoolInfo.name,
          city: schoolInfo.city,
          pobox: schoolInfo.pobox
        }
      });
    }

    // --- PHASE 0: Deletions ---
    const deletionResults: DeletionResult[] = [];
    if (data.deletions) {
      for (const del of data.deletions) {
        try {
          const modelName = del.tableName === 'academic_years' ? 'academicYear' :
                            del.tableName === 'classes' ? 'class' :
                            del.tableName === 'domains' ? 'domain' :
                            del.tableName === 'students' ? 'student' :
                            del.tableName === 'subjects' ? 'subject' :
                            del.tableName === 'grades' ? 'grade' :
                            del.tableName === 'notes' ? 'note' : null;

          if (modelName) {
            await (prisma as any)[modelName].deleteMany({
              where: { schoolId, localId: del.localId }
            });

            await prisma.deletedRecord.create({
              data: {
                schoolId,
                tableName: del.tableName,
                localId: del.localId
              }
            });
            deletionResults.push({ localId: del.localId, tableName: del.tableName, success: true });
          }
        } catch (e) {
          console.error(`Failed to push deletion for ${del.tableName}:${del.localId}`, e);
          deletionResults.push({ localId: del.localId, tableName: del.tableName, success: false });
        }
      }
    }

    // --- PHASE 1: Academic Years ---
    const ayResults: SyncResult[] = [];
    if (data.academicYears) {
      for (const ay of data.academicYears) {
        // Upsert academic years. Normalized isCurrent to boolean (SQLite uses 0/1).
        const result = await prisma.academicYear.upsert({
          where: { schoolId_localId: { schoolId, localId: ay.localId } },
          create: {
            schoolId,
            localId: ay.localId,
            name: ay.name,
            startDate: ay.startDate,
            endDate: ay.endDate,
            isCurrent: normalizeBool(ay.isCurrent)
          },
          update: {
            name: ay.name,
            startDate: ay.startDate,
            endDate: ay.endDate,
            isCurrent: normalizeBool(ay.isCurrent)
          }
        });
        ayResults.push({ localId: ay.localId, serverId: result.id });
      }
    }

    // --- PHASE 2: Classes ---
    const classResults: SyncResult[] = [];
    if (data.classes) {
      for (const c of data.classes) {
        if (!c.academicYearLocalId) continue; // Skip if no academic year linked

        const result = await prisma.class.upsert({
          where: { schoolId_localId: { schoolId, localId: c.localId } },
          create: {
            // Note: Removed redundant schoolId scalar to favor relation connect
            localId: c.localId,
            name: c.name,
            level: String(c.level || ''), // Normalized to String to match SQLite schema
            option: c.option || '',
            section: c.section || '',
            academicYear: { connect: { schoolId_localId: { schoolId, localId: c.academicYearLocalId } } },
            school: { connect: { id: schoolId } }
          },
          update: {
            name: c.name,
            level: String(c.level || ''),
            option: c.option || '',
            section: c.section || '',
            academicYear: { connect: { schoolId_localId: { schoolId, localId: c.academicYearLocalId } } }
          }
        });
        classResults.push({ localId: c.localId, serverId: result.id });
      }
    }

    // --- PHASE 4: Domains ---
    const domainResults: SyncResult[] = [];
    if (data.domains) {
      for (const d of data.domains) {
        // Upsert domains. Normalized displayOrder to Int.
        const result = await prisma.domain.upsert({
          where: { schoolId_localId: { schoolId, localId: d.localId } },
          create: {
            schoolId,
            localId: d.localId,
            name: d.name,
            displayOrder: Number(d.displayOrder || 0)
          },
          update: {
            name: d.name,
            displayOrder: Number(d.displayOrder || 0)
          }
        });
        domainResults.push({ localId: d.localId, serverId: result.id });
      }
    }

    // --- PHASE 5: Students ---
    const studentResults: SyncResult[] = [];
    if (data.students) {
      for (const s of data.students) {
        // Upsert students. Normalized isAbandoned to boolean.
        // Removed redundant schoolId scalar in create block.
        const result = await prisma.student.upsert({
          where: { schoolId_localId: { schoolId, localId: s.localId } },
          create: {
            localId: s.localId,
            firstName: s.firstName,
            lastName: s.lastName,
            postName: s.postName || '',
            gender: s.gender,
            birthDate: s.birthDate,
            birthplace: s.birthplace || '',
            conduite: s.conduite || '',
            conduiteP1: s.conduiteP1 || '',
            conduiteP2: s.conduiteP2 || '',
            conduiteP3: s.conduiteP3 || '',
            conduiteP4: s.conduiteP4 || '',
            isAbandoned: normalizeBool(s.isAbandoned),
            abandonReason: s.abandonReason || '',
            class: s.classLocalId ? { connect: { schoolId_localId: { schoolId, localId: s.classLocalId } } } : undefined,
            school: { connect: { id: schoolId } }
          },
          update: {
            firstName: s.firstName,
            lastName: s.lastName,
            postName: s.postName || '',
            gender: s.gender,
            birthDate: s.birthDate,
            birthplace: s.birthplace || '',
            conduite: s.conduite || '',
            conduiteP1: s.conduiteP1 || '',
            conduiteP2: s.conduiteP2 || '',
            conduiteP3: s.conduiteP3 || '',
            conduiteP4: s.conduiteP4 || '',
            isAbandoned: normalizeBool(s.isAbandoned),
            abandonReason: s.abandonReason || '',
            class: s.classLocalId ? { connect: { schoolId_localId: { schoolId, localId: s.classLocalId } } } : undefined,
            updatedAt: new Date()
          }
        });
        studentResults.push({ localId: s.localId, serverId: result.id });
      }
    }

    // --- PHASE 6: Subjects ---
    const subjectResults: SyncResult[] = [];
    if (data.subjects) {
      for (const s of data.subjects) {
        // Upsert subjects. Removed redundant schoolId scalar in create block.
        const result = await prisma.subject.upsert({
          where: { schoolId_localId: { schoolId, localId: s.localId } },
          create: {
            localId: s.localId,
            name: s.name,
            code: s.code,
            maxPoints: Number(s.maxPoints || 20),
            maxP1: Number(s.maxP1 || 10),
            maxP2: Number(s.maxP2 || 10),
            maxExam1: Number(s.maxExam1 || 20),
            maxP3: Number(s.maxP3 || 10),
            maxP4: Number(s.maxP4 || 10),
            maxExam2: Number(s.maxExam2 || 20),
            category: s.category,
            subDomain: s.subDomain || '',
            class: { connect: { schoolId_localId: { schoolId, localId: s.classLocalId } } },
            domain: s.domainLocalId ? { connect: { schoolId_localId: { schoolId, localId: s.domainLocalId } } } : undefined,
            school: { connect: { id: schoolId } }
          },
          update: {
            name: s.name,
            code: s.code,
            maxPoints: Number(s.maxPoints || 20),
            maxP1: Number(s.maxP1 || 10),
            maxP2: Number(s.maxP2 || 10),
            maxExam1: Number(s.maxExam1 || 20),
            maxP3: Number(s.maxP3 || 10),
            maxP4: Number(s.maxP4 || 10),
            maxExam2: Number(s.maxExam2 || 20),
            category: s.category,
            subDomain: s.subDomain || '',
            class: { connect: { schoolId_localId: { schoolId, localId: s.classLocalId } } },
            domain: s.domainLocalId ? { connect: { schoolId_localId: { schoolId, localId: s.domainLocalId } } } : undefined,
            updatedAt: new Date()
          }
        });
        subjectResults.push({ localId: s.localId, serverId: result.id });
      }
    }

    // --- PHASE 7: Grades ---
    const gradeResults: SyncResult[] = [];
    if (data.grades) {
      for (const g of data.grades) {
        const result = await prisma.grade.upsert({
          where: { schoolId_localId: { schoolId, localId: g.localId } },
          create: {
            localId: g.localId,
            points: Number(g.points || 0),
            period: String(g.period || ''),
            // Use studentId/subjectId from incoming data (mapped in syncService as studentId/subjectId)
            student: { connect: { schoolId_localId: { schoolId, localId: g.studentId } } },
            subject: { connect: { schoolId_localId: { schoolId, localId: g.subjectId } } },
            school: { connect: { id: schoolId } }
          },
          update: {
            points: Number(g.points || 0),
            period: String(g.period || ''),
            // connect updates usually not needed unless student/subject changed, but assuming they don't for now or are handled via ID stability
            updatedAt: new Date()
          }
        });
        gradeResults.push({ localId: g.localId, serverId: result.id });
      }
    }

    // --- PHASE 8: Notes ---
    const noteResults: SyncResult[] = [];
    if (data.notes) {
      for (const n of data.notes) {
        const result = await prisma.note.upsert({
          where: { schoolId_localId: { schoolId, localId: n.localId } },
          create: {
            localId: n.localId,
            title: n.title,
            content: n.content,
            academicYear: { connect: { schoolId_localId: { schoolId, localId: n.academicYearLocalId } } },
            school: { connect: { id: schoolId } }
          },
          update: {
            title: n.title,
            content: n.content,
            updatedAt: new Date()
          }
        });
        noteResults.push({ localId: n.localId, serverId: result.id });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results: { 
        academicYears: ayResults,
        classes: classResults,
        domains: domainResults,
        students: studentResults,
        subjects: subjectResults,
        grades: gradeResults,
        notes: noteResults,
        deletions: deletionResults
      } 
    });

  } catch (error: any) {
    console.error('Sync push error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
