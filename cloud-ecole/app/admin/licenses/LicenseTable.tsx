/**
 * LicenseTable.tsx
 * 
 * Displays the list of licenses with search, status display, and actions.
 * Client Component.
 */

'use client';

import { useState } from 'react';
import { Key as KeyIcon, Search, ShieldCheck, ShieldX, Calendar, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import ExtendLicenseModal from './ExtendLicenseModal';

interface License {
  id: string;
  key: string;
  active: boolean;
  expiresAt: string | Date; // Can be string after serialization
  school: {
    name: string;
  };
}

interface LicenseTableProps {
  licenses: License[];
}

export default function LicenseTable({ licenses }: LicenseTableProps) {
  const [search, setSearch] = useState('');
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);

  // Capture current time once for consistent rendering
  const now = Date.now();

  // Filter licenses based on search
  const filteredLicenses = licenses.filter(l => 
    l.key.toLowerCase().includes(search.toLowerCase()) || 
    l.school.name.toLowerCase().includes(search.toLowerCase())
  );

  /**
   * Determine license status
   */
  const getStatus = (license: License) => {
    const isExpired = new Date(license.expiresAt).getTime() < now;
    const isActive = license.active;
    
    if (isExpired) return 'EXPIRED';
    if (!isActive) return 'PENDING';
    return 'ACTIVE';
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher une licence..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Clé de Licence</th>
                <th className="px-6 py-4">Établissement</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Expiration</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Aucune licence trouvée.
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((license) => {
                  const status = getStatus(license);
                  
                  return (
                    <tr key={license.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <KeyIcon size={16} />
                          </div>
                          <span className="font-mono text-sm font-bold text-slate-700 tracking-wider">
                            {license.key}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">{license.school.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        {status === 'ACTIVE' && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                            <ShieldCheck size={14} /> Activée
                          </div>
                        )}
                        {status === 'PENDING' && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                            <Clock size={14} /> En attente
                          </div>
                        )}
                        {status === 'EXPIRED' && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                            <AlertTriangle size={14} /> Expirée
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 text-sm ${
                           new Date(license.expiresAt).getTime() < now + 30 * 24 * 60 * 60 * 1000
                             ? 'text-amber-600 font-medium'
                             : 'text-slate-500'
                        }`}>
                          <Calendar size={14} />
                          {new Date(license.expiresAt).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedLicense(license)}
                          title="Prolonger / Réactiver"
                          className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-colors border border-slate-200 shadow-sm"
                        >
                          <RefreshCw size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extend Modal */}
      {selectedLicense && (
        <ExtendLicenseModal 
          license={selectedLicense} 
          onClose={() => setSelectedLicense(null)}
          onSuccess={() => setSelectedLicense(null)}
        />
      )}
    </>
  );
}
