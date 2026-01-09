'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Calendar, School, MapPin, Mail, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SchoolData {
  id: string;
  name: string;
  city: string;
  pobox: string | null;
  license: {
    expiresAt: string;
    key: string;
  } | null;
}

interface SchoolModalProps {
  school?: SchoolData;
  trigger?: React.ReactNode;
}

export default function SchoolModal({ school, trigger }: SchoolModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    pobox: '',
    expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    licenseKey: ''
  });

  useEffect(() => {
    if (school && isOpen) {
      setFormData({
        name: school.name,
        city: school.city,
        pobox: school.pobox || '',
        expiresAt: school.license ? new Date(school.license.expiresAt).toISOString().split('T')[0] : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        licenseKey: school.license?.key || ''
      });
    }
  }, [school, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const method = school ? 'PATCH' : 'POST';
      const body = school ? { ...formData, id: school.id } : formData;

      const res = await fetch('/api/admin/schools', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (result.success) {
        setIsOpen(false);
        router.refresh();
        if (!school) {
          setFormData({
            name: '',
            city: '',
            pobox: '',
            expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            licenseKey: ''
          });
        }
      } else {
        setError(result.error || 'Une erreur est survenue');
      }
    } catch (err) {
      setError(`Erreur de connexion au serveur ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger ? trigger : (
          <button 
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={18} />
            Nouvelle École
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">
                {school ? 'Modifier l\'École' : 'Ajouter une École'}
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2 text-left justify-start">
                  <School size={16} className="text-blue-500" />
                  Nom de l&apos;établissement
                </label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  placeholder="Ex: Institut Technique de Kinshasa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 text-left justify-start">
                    <MapPin size={16} className="text-green-500" />
                    Ville
                  </label>
                  <input 
                    required
                    type="text" 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    placeholder="Kinshasa"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 text-left justify-start">
                    <Mail size={16} className="text-purple-500" />
                    B.P.
                  </label>
                  <input 
                    type="text" 
                    value={formData.pobox}
                    onChange={e => setFormData({...formData, pobox: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    placeholder="B.P. 1234"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2 text-left justify-start">
                  <Calendar size={16} className="text-red-500" />
                  Date d&apos;expiration
                </label>
                <input 
                  required
                  type="date" 
                  value={formData.expiresAt}
                  onChange={e => setFormData({...formData, expiresAt: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
              </div>

              {!school && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 text-left justify-start">
                    <Key size={16} className="text-amber-500" />
                    Clé personnalisée (optionnel)
                  </label>
                  <input 
                    type="text" 
                    value={formData.licenseKey}
                    onChange={e => setFormData({...formData, licenseKey: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase text-slate-900"
                    placeholder="Générer automatiquement si vide"
                  />
                </div>
              )}

              {school && school.license && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                   <Key size={16} className="text-amber-500 mt-1 shrink-0" />
                   <div>
                     <p className="text-xs font-bold text-amber-800">Clé de licence active</p>
                     <p className="text-sm font-mono text-amber-700">{school.license.key}</p>
                   </div>
                </div>
              )}

              <div className="pt-4">
                <button 
                  disabled={loading}
                  type="submit"
                  className={`w-full ${school ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'} text-white py-3 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50`}
                >
                  {loading ? (school ? 'Mise à jour...' : 'Création...') : (school ? 'Enregistrer les modifications' : 'Créer l\'école & Générer la licence')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
