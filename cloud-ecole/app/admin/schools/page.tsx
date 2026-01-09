/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@/lib/prisma";
import SchoolModal from "./SchoolModal";
import SchoolsTable from "./SchoolsTable";

export const dynamic = 'force-dynamic';

export default async function SchoolsPage() {
  const schools = await prisma.school.findMany({
    include: {
      license: true,
      _count: {
        select: { students: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Établissements</h1>
          <p className="text-slate-500 text-sm">Consultez et gérez les écoles enregistrées</p>
        </div>
        <SchoolModal />
      </div>

      <SchoolsTable initialSchools={schools as any} />
    </div>
  );
}
