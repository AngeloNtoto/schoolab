/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Licenses Admin Page
 * 
 * Displays all licenses and provides functionality to:
 * - View all licenses grouped by school
 * - Generate new license keys
 * - Toggle license active status (TODO)
 * 
 * Uses Server Components for initial data fetch
 * and Client Components for interactivity.
 */

import prisma from "@/lib/prisma";
import LicenseTable from "./LicenseTable";
import GenerateLicenseButton from "./GenerateLicenseButton";

export const dynamic = 'force-dynamic';
export default async function LicensesPage() {
  // Fetch all licenses with related school data
  const licenses = await prisma.license.findMany({
    include: {
      school: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch all schools for the generate modal dropdown
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, license: true },
    orderBy: { name: 'asc' }
  });

  // Filter schools that don't have a license yet
  const schoolsWithoutLicense = schools.filter((s: any) => !s.license);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Licences</h1>
          <p className="text-slate-500 text-sm">Générez et suivez l&apos;activation des clés d&apos;accès</p>
        </div>
        
        {/* Generate Button (Client Component) */}
        <GenerateLicenseButton schools={schoolsWithoutLicense} />
      </div>

      {/* License Table */}
      <LicenseTable licenses={licenses} />
    </div>
  );
}
