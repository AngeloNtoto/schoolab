/**
 * Generate License Key API
 * 
 * POST /api/admin/licenses/generate
 * 
 * Creates a new license key for a school.
 * Requires admin authentication (TODO: implement proper auth check).
 * 
 * Request body:
 * - schoolId: string (required) - The school to create the license for
 * - expiresAt: string (required) - ISO date string for license expiration
 * 
 * Response:
 * - success: boolean
 * - license: { key, expiresAt, schoolId } on success
 * - error: string on failure
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

/**
 * Generate a random license key in format XXXX-XXXX-XXXX-XXXX
 */
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  
  for (let block = 0; block < 4; block++) {
    if (block > 0) key += '-';
    for (let i = 0; i < 4; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      key += chars[randomIndex];
    }
  }
  
  return key;
}

export async function POST(request: Request) {
  try {
    // TODO: Add proper admin authentication check
    const { schoolId, expiresAt } = await request.json();

    // Validate required fields
    if (!schoolId || !expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Missing schoolId or expiresAt' },
        { status: 400 }
      );
    }

    // Check if school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { license: true }
    });

    if (!school) {
      return NextResponse.json(
        { success: false, error: 'School not found' },
        { status: 404 }
      );
    }

    // Check if school already has a license
    if (school.license) {
      return NextResponse.json(
        { success: false, error: 'School already has a license. Delete the existing one first.' },
        { status: 409 }
      );
    }

    // Generate unique key
    let key = generateLicenseKey();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure key is unique
    while (attempts < maxAttempts) {
      const existing = await prisma.license.findUnique({ where: { key } });
      if (!existing) break;
      key = generateLicenseKey();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate unique key' },
        { status: 500 }
      );
    }

    // Create the license
    const license = await prisma.license.create({
      data: {
        key,
        expiresAt: new Date(expiresAt),
        schoolId,
        active: false // Will be set to true on activation
      }
    });

    return NextResponse.json({
      success: true,
      license: {
        key: license.key,
        expiresAt: license.expiresAt,
        schoolId: license.schoolId
      }
    });

  } catch (error) {
    console.error('Generate license error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
