'use client';

import { MoreVertical, MapPin, Search } from "lucide-react";
import SchoolModal from "./SchoolModal";
import { useState } from "react";

interface SchoolData {
  id: string;
  name: string;
  city: string;
  pobox: string | null;
  license: {
    active: boolean;
    key: string;
    expiresAt: string;
  } | null;
  _count: {
    students: number;
  };
}

interface SchoolsTableProps {
  initialSchools: SchoolData[];
}

export default function SchoolsTable({ initialSchools }: SchoolsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSchools = initialSchools.filter(school => 
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
         <Search size={18} className="text-slate-400" />
         <input 
           type="text" 
           placeholder="Rechercher une école..." 
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400 text-slate-700"
         />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
              <th className="px-6 py-4">École</th>
              <th className="px-6 py-4">Localisation</th>
              <th className="px-6 py-4">Statut Licence</th>
              <th className="px-6 py-4 text-center">Élèves</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredSchools.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                  {searchTerm ? "Aucun résultat trouvé." : "Aucune école enregistrée pour le moment."}
                </td>
              </tr>
            ) : (
              filteredSchools.map((school) => (
                <SchoolModal 
                  key={school.id} 
                  school={school}
                  trigger={
                    <tr className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                            {school.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{school.name}</p>
                            <p className="text-xs text-slate-400 capitalize font-mono">ID: {school.id.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin size={14} className="text-slate-400" />
                          <span className="text-sm">{school.city}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {school.license ? (
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            school.license.active 
                              ? 'bg-green-50 text-green-600' 
                              : 'bg-amber-50 text-amber-600'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${school.license.active ? 'bg-green-600' : 'bg-amber-600'}`}></div>
                            {school.license.active ? 'Active' : 'Expirée'}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sans licence</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-slate-700">{school._count.students}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-600">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
