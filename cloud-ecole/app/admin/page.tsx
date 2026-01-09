import { School, Key, Users, ArrowUpRight, TrendingUp } from "lucide-react";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  // Fetch real counts from the database
  const schoolCount = await prisma.school.count();
  const licenseCount = await prisma.license.count({ where: { active: true } });
  const studentCount = await prisma.student.count();

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<School className="text-blue-600" />} 
          label="Écoles Actives" 
          value={schoolCount.toString()} 
          trend="Données réelles"
        />
        <StatCard 
          icon={<Key className="text-amber-600" />} 
          label="Licences Actives" 
          value={licenseCount.toString()} 
          trend="Total validé"
        />
        <StatCard 
          icon={<Users className="text-emerald-600" />} 
          label="Élèves Synchronisés" 
          value={studentCount.toLocaleString()} 
          trend="Base de données Cloud"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-800">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">Activités Récentes</h3>
            <button className="text-sm font-semibold text-blue-600 hover:underline">Voir tout</button>
         </div>
         <div className="divide-y divide-slate-50">
            {schoolCount === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Aucune activité enregistrée pour le moment.
              </div>
            ) : (
              <>
                <ActivityItem 
                   type="license" 
                   text="Flux d'activité connecté" 
                   time="En mode réel"
                />
              </>
            )}
         </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
        <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-full">
           <TrendingUp size={12} />
           {trend}
        </div>
      </div>
      <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-3xl font-extrabold text-slate-900">{value}</h3>
    </div>
  );
}

function ActivityItem({ type, text, time }: { type: 'license' | 'sync' | 'user', text: string, time: string }) {
  return (
    <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
       <div className={`w-2 h-2 rounded-full ${type === 'license' ? 'bg-amber-400' : type === 'sync' ? 'bg-blue-400' : 'bg-emerald-400'}`}></div>
       <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 truncate">{text}</p>
          <p className="text-xs text-slate-400">{time}</p>
       </div>
       <ArrowUpRight size={16} className="text-slate-300" />
    </div>
  );
}
