/**
 * ExtendLicenseModal.tsx
 * 
 * Modal for extending/reactivating a license key.
 * Allows setting a new expiration date.
 */

'use client';

import { useState } from 'react';
import { X, Calendar, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface License {
  id: string;
  key: string;
  active: boolean;
  expiresAt: string | Date;
  school: {
    name: string;
  };
}

interface ExtendLicenseModalProps {
  license: License;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExtendLicenseModal({ license, onClose, onSuccess }: ExtendLicenseModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Default to +1 year from existing expiry or now (if expired)
  const [newExpiresAt, setNewExpiresAt] = useState(() => {
    const currentExpiry = new Date(license.expiresAt).getTime();
    const now = Date.now();
    // Base is usually the LATER of now or current expiry
    // But if it's expired, we definitely want to extend relative to NOW or keep old expiry + 1 year relative to old expiry?
    // Usually "Reactivate" means "make it work from now".
    // "Extend" means "add time".
    // I'll default to max(now, expiry) + 1 year
    const base = Math.max(now, currentExpiry);
    const date = new Date(base);
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  });

  const handleExtend = async () => {
    if (!newExpiresAt) {
      setError('Sélectionnez une date.');
      return;
    }

    // Check duration < 30 days
    const daysUntilExpiration = Math.ceil((new Date(newExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiration < 30) {
      if (!window.confirm(`Attention: Cette date expire dans ${daysUntilExpiration} jours (moins de 30 jours). Continuer ?`)) {
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/licenses/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId: license.id,
          newExpiresAt: new Date(newExpiresAt).toISOString()
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        router.refresh();
      } else {
        setError(result.error || 'Échec de la prolongation');
      }
    } catch (err) {
      setError(`Erreur technique. ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw size={24} />
            <h2 className="text-xl font-bold">Prolonger / Réactiver</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-sm text-slate-500 mb-1">Licence pour</p>
            <p className="font-semibold text-slate-800">{license.school.name}</p>
            <p className="font-mono text-xs text-slate-400 mt-2">{license.key}</p>
          </div>

          <div>
             <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Calendar size={16} className="text-green-500" />
                Nouvelle date d&apos;expiration
              </label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-slate-400 mt-2 ml-1">
                Actuellement: {new Date(license.expiresAt).toLocaleDateString('fr-FR')}
              </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200 flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
             <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              onClick={handleExtend}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
              {loading ? 'Traitement...' : 'Valider'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
