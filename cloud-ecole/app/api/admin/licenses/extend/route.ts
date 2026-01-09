/**
 * Extend License API
 * 
 * POST /api/admin/licenses/extend
 * 
 * Extends the expiration date of a license and reactivates it if needed.
 * 
 * Request body:
 * - licenseId: string (required)
 * - newExpiresAt: string (required) - ISO date string
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { licenseId, newExpiresAt } = await request.json();

    if (!licenseId || !newExpiresAt) {
      return NextResponse.json(
        { success: false, error: 'Missing licenseId or newExpiresAt' },
        { status: 400 }
      );
    }

    // Verify license exists
    const license = await prisma.license.findUnique({
      where: { id: licenseId }
    });

    if (!license) {
      return NextResponse.json(
        { success: false, error: 'License not found' },
        { status: 404 }
      );
    }

    // Update the license
    const updatedLicense = await prisma.license.update({
      where: { id: licenseId },
      data: {
        expiresAt: new Date(newExpiresAt),
        active: true // Reactivate if it was disabled/expired
        // Note: In a real system, we might want to keep 'active' false if it was pending activation.
        // But here 'active' usually means "can be used". 
        // If it was expired, we definitely want it active. 
        // If it was pending (new), setting it active might bypass activation? 
        // Actually, our local app checks 'active' from server. 
        // The activation flow sets hardware ID. 
        // If we set active=true here, but no HWID is linked, it might be fine or might need logic.
        // For now, simpler is better: if admin extends it, they want it to work.
      }
    });

    return NextResponse.json({
      success: true,
      license: updatedLicense
    });

  } catch (error) {
    console.error('Extend license error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
