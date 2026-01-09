import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '@/lib/encryption';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

export async function POST(request: Request) {
  try {
    const { key, hwid, password } = await request.json();

    if (!key || !hwid) {
      return NextResponse.json({ success: false, error: 'Missing key or HWID' }, { status: 400 });
    }

    // Find the license
    const license = await prisma.license.findUnique({
      where: { key },
      include: { school: true }
    });

    if (!license) {
      return NextResponse.json({ success: false, error: 'Invalid license key' }, { status: 404 });
    }

    const { school } = license as any;

    // Password Logic
    if (school.adminPassword) {
      // Existing school with password - REQUIRE it
      if (!password) {
        return NextResponse.json({ success: false, error: 'PASSWORD_REQUIRED' }, { status: 401 });
      }
      
      try {
        const decrypted = decrypt(school.adminPassword);
        if (decrypted !== password) {
          return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 403 });
        }
      } catch (e) {
        console.error("Decryption failed:", e);
        return NextResponse.json({ success: false, error: 'Server encryption error' }, { status: 500 });
      }
    } else {
      // New school or first activation - REQUIRE a password to be set
      if (!password) {
        return NextResponse.json({ success: false, error: 'PASSWORD_REQUIRED_FOR_SETUP' }, { status: 401 });
      }
      
      // Store encrypted password
      await prisma.school.update({
        where: { id: school.id },
        data: { adminPassword: encrypt(password) }
      });
    }

    // Check if machine is already registered or if we should register it
    const isRegistered = ((license as any).hwids as string[]).includes(hwid);

    if (!isRegistered) {
      await prisma.license.update({
        where: { key },
        data: { 
          hwids: {
            push: hwid
          },
          active: true 
        }
      });
    }

    // Generate a real JWT token for the school
    const token = jwt.sign(
      { 
        schoolId: license.schoolId,
        licenseKey: license.key 
      }, 
      JWT_SECRET,
      { expiresIn: '365d' } // Long lived token for the school app
    );

    // Return success and school info
    return NextResponse.json({
      success: true,
      school: license.school,
      expiresAt: license.expiresAt,
      token
    });

  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
