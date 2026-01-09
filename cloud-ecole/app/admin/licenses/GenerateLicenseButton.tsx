/**
 * GenerateLicenseButton.tsx
 * 
 * Client Component for generating new license keys.
 * Opens a modal to select school and expiration date.
 */

'use client';

import { useState } from 'react';
import { Plus, X, Key, Calendar, Building2, Loader2, Check, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface School {
  id: string;
  name: string;
}

interface GenerateLicenseButtonProps {
  schools: School[];
}

export default function GenerateLicenseButton({ schools }: GenerateLicenseButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [selectedSchool, setSelectedSchool] = useState('');
  const [expiresAt, setExpiresAt] = useState(() => {
    // Default to 1 year from now
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  });

  // Generated key result
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  /**
   * Handle form submission - generate the license
   */
  const handleGenerate = async () => {
    if (!selectedSchool || !expiresAt) {
      setError('Veuillez sélectionner une école et une date d\'expiration.');
      return;
    }

    // Check if duration is less than 30 days
    const daysUntilExpiration = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 30) {
      if (!window.confirm(`Attention: Cette licence expirera dans ${daysUntilExpiration} jours (moins de 30 jours). Voulez-vous vraiment continuer ?`)) {
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/licenses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: selectedSchool,
          expiresAt: new Date(expiresAt).toISOString()
        })
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedKey(result.license.key);
      } else {
        setError(result.error || 'Échec de la génération');
      }
    } catch (err) {
      setError(`Erreur technique. Réessayez. ${err}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy the generated key to clipboard
   */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Close modal and refresh the page
   */
  const handleClose = () => {
    setIsOpen(false);
    setGeneratedKey('');
    setSelectedSchool('');
    setError('');
    if (generatedKey) {
      router.refresh(); // Refresh to show new license
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
      >
        <Plus size={18} />
        Générer une Clé
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key size={24} />
                <h2 className="text-xl font-bold">Générer une Licence</h2>
              </div>
              <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {!generatedKey ? (
                <>
                  {/* School Selection */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <Building2 size={16} className="text-blue-500" />
                      Établissement
                    </label>
                    {schools.length === 0 ? (
                      <p className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
                        Toutes les écoles ont déjà une licence. Créez d&apos;abord une nouvelle école.
                      </p>
                    ) : (
                      <select
                        value={selectedSchool}
                        onChange={(e) => setSelectedSchool(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">-- Sélectionner une école --</option>
                        {schools.map(school => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Expiration Date */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <Calendar size={16} className="text-green-500" />
                      Date d&apos;expiration
                    </label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                      {error}
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={loading || schools.length === 0}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Key size={20} />}
                    {loading ? 'Génération...' : 'Générer la Clé'}
                  </button>
                </>
              ) : (
                /* Success - Show Generated Key */
                <div className="text-center space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <Check className="text-green-600 mx-auto mb-2" size={32} />
                    <p className="text-green-700 font-semibold">Clé générée avec succès !</p>
                  </div>

                  <div className="bg-slate-100 rounded-xl p-6">
                    <p className="text-xs text-slate-500 mb-2">Clé de licence</p>
                    <p className="font-mono text-2xl font-bold text-slate-800 tracking-widest">
                      {generatedKey}
                    </p>
                  </div>

                  <button
                    onClick={handleCopy}
                    className="w-full border-2 border-slate-200 py-3 rounded-xl font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                    {copied ? 'Copié !' : 'Copier la clé'}
                  </button>

                  <button
                    onClick={handleClose}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
