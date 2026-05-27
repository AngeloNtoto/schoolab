import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Check, 
  RefreshCw, 
  RotateCcw,
  Plus
} from '../iconsSvg';
import { useToast } from '../../context/ToastContext';
import { 
  deliberationConfigService, 
  DeliberationConfig, 
  DEFAULT_DELIBERATION_CONFIG,
  RachatRule,
  AppreciationRule
} from '../../services/deliberationConfigService';

export default function DeliberationSettingsTab() {
  const [config, setConfig] = useState<DeliberationConfig>(DEFAULT_DELIBERATION_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const loadedConfig = await deliberationConfigService.load();
      setConfig(loadedConfig);
    } catch (e) {
      toast.error('Erreur lors du chargement des critères de délibération.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation d'unicité des maxPointsLimite pour les rachats
    const rachatMaxPoints = config.rachatRules.map(r => r.maxPointsLimite);
    const uniqueRachatMax = new Set(rachatMaxPoints);
    if (uniqueRachatMax.size !== rachatMaxPoints.length) {
      toast.error('Chaque règle de rachat doit avoir une "Limite Maximum" unique.');
      return;
    }

    // Validation d'unicité des seuils pour les appréciations
    const apprSeuils = config.appreciationRules.map(a => a.seuilMin);
    const uniqueApprSeuils = new Set(apprSeuils);
    if (uniqueApprSeuils.size !== apprSeuils.length) {
      toast.error('Chaque appréciation doit avoir un "Seuil Minimum" unique.');
      return;
    }

    setSaving(true);
    try {
      await deliberationConfigService.save(config);
      toast.success('Critères de délibération mis à jour avec succès !');
      window.dispatchEvent(new CustomEvent('db:changed', { detail: {} }));
    } catch (e) {
      toast.error('Erreur technique lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await toast.confirm({
      title: 'Restaurer les valeurs par défaut',
      message: 'Voulez-vous vraiment écraser toutes vos configurations par les valeurs standards ?',
      confirmLabel: 'Restaurer',
      cancelLabel: 'Annuler',
      variant: 'warning'
    });

    if (confirmed) {
      setConfig({ ...DEFAULT_DELIBERATION_CONFIG });
      toast.success('Valeurs restaurées. Cliquez sur Enregistrer pour appliquer.');
    }
  };

  // --- Gestion des Rachats ---
  const handleUpdateRachat = (id: string, field: keyof RachatRule, value: number) => {
    const newRules = config.rachatRules.map(r => r.id === id ? { ...r, [field]: value } : r);
    setConfig({ ...config, rachatRules: newRules });
  };

  const handleRemoveRachat = (id: string) => {
    const newRules = config.rachatRules.filter(r => r.id !== id);
    setConfig({ ...config, rachatRules: newRules });
  };

  const handleAddRachat = () => {
    const newId = Date.now().toString();
    const newRules = [...config.rachatRules, { id: newId, maxPointsLimite: 100, pointsManquantsMax: 5 }];
    setConfig({ ...config, rachatRules: newRules });
  };

  // --- Gestion des Appréciations ---
  const handleUpdateAppreciation = (id: string, field: keyof AppreciationRule, value: any) => {
    const newRules = config.appreciationRules.map(a => a.id === id ? { ...a, [field]: value } : a);
    setConfig({ ...config, appreciationRules: newRules });
  };

  const handleRemoveAppreciation = (id: string) => {
    const newRules = config.appreciationRules.filter(a => a.id !== id);
    setConfig({ ...config, appreciationRules: newRules });
  };

  const handleAddAppreciation = () => {
    const newId = Date.now().toString();
    const newRules = [...config.appreciationRules, { id: newId, seuilMin: 50, label: 'Nouveau', abrev: 'N' }];
    setConfig({ ...config, appreciationRules: newRules });
  };

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Délibération</h2>
        <p className="text-slate-500 dark:text-slate-400 text-[13px] mt-1">
          Paramétrez les seuils de réussite, les règles de rachat et l'échelle d'appréciation.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">

          {/* Section 1: Seuils */}
          <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Seuils de réussite</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Pourcentage global pour réussir</label>
                <input 
                  type="number" min="0" max="100" 
                  value={config.seuilReussiteGlobal} 
                  onChange={(e) => setConfig({...config, seuilReussiteGlobal: Number(e.target.value)})} 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm font-medium" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Seuil de réussite d'une matière (%)</label>
                <input 
                  type="number" min="0" max="100" 
                  value={config.seuilEchecMatiere} 
                  onChange={(e) => setConfig({...config, seuilEchecMatiere: Number(e.target.value)})} 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm font-medium" 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Rachat */}
          <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Critères de rachat (Points max relevables)</h3>
              <button 
                type="button" 
                onClick={handleAddRachat}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all"
              >
                <Plus size={14} /> Ajouter un seuil
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2">
                <div className="col-span-5">Max points du cours (≤)</div>
                <div className="col-span-5">Points manquants tolérés</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {[...config.rachatRules].sort((a, b) => a.maxPointsLimite - b.maxPointsLimite).map((rule) => (
                <div key={rule.id} className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
                  <div className="col-span-5">
                    <input 
                      type="number" min="0" 
                      value={rule.maxPointsLimite} 
                      onChange={(e) => handleUpdateRachat(rule.id, 'maxPointsLimite', Number(e.target.value))} 
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium" 
                    />
                  </div>
                  <div className="col-span-5">
                    <input 
                      type="number" min="0" 
                      value={rule.pointsManquantsMax} 
                      onChange={(e) => handleUpdateRachat(rule.id, 'pointsManquantsMax', Number(e.target.value))} 
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium" 
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <button 
                      type="button" 
                      onClick={() => handleRemoveRachat(rule.id)}
                      className="text-red-500 hover:text-red-600 p-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg"
                      title="Supprimer"
                    >
                      <span className="font-bold text-xs px-1">X</span>
                    </button>
                  </div>
                </div>
              ))}
              {config.rachatRules.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4">Aucune règle de rachat configurée.</div>
              )}
            </div>
          </div>

          {/* Section 3: Appréciations */}
          <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Échelle d'appréciation</h3>
              <button 
                type="button" 
                onClick={handleAddAppreciation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all"
              >
                <Plus size={14} /> Ajouter une mention
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2">
                <div className="col-span-3">Seuil Min (%)</div>
                <div className="col-span-5">Libellé complet</div>
                <div className="col-span-2">Abrégé</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {[...config.appreciationRules].sort((a, b) => b.seuilMin - a.seuilMin).map((rule) => (
                <div key={rule.id} className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
                  <div className="col-span-3">
                    <input 
                      type="number" min="0" max="100" 
                      value={rule.seuilMin} 
                      onChange={(e) => handleUpdateAppreciation(rule.id, 'seuilMin', Number(e.target.value))} 
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center font-medium" 
                    />
                  </div>
                  <div className="col-span-5">
                    <input 
                      type="text" 
                      value={rule.label} 
                      onChange={(e) => handleUpdateAppreciation(rule.id, 'label', e.target.value)} 
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" 
                    />
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="text" 
                      value={rule.abrev} 
                      onChange={(e) => handleUpdateAppreciation(rule.id, 'abrev', e.target.value)} 
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" 
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <button 
                      type="button" 
                      onClick={() => handleRemoveAppreciation(rule.id)}
                      className="text-red-500 hover:text-red-600 p-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg"
                      title="Supprimer"
                    >
                      <span className="font-bold text-xs px-1">X</span>
                    </button>
                  </div>
                </div>
              ))}
              {config.appreciationRules.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4">Aucune échelle configurée.</div>
              )}
            </div>
          </div>

          {/* Section 4: Palmarès */}
          <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Libellés du Palmarès</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'categorie_1_label', label: 'Catégorie 1 (Réussite)' },
                { key: 'categorie_2_label', label: 'Catégorie 2 (Repêchage)' },
                { key: 'categorie_3_label', label: 'Catégorie 3 (Échec)' },
                { key: 'categorie_4_label', label: 'Catégorie 4 (Abandons)' },
                { key: 'categorie_5_label', label: 'Catégorie 5 (Non classés)' },
              ].map((cat) => (
                <div key={cat.key} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{cat.label}</label>
                  <input 
                    type="text" 
                    value={(config as any)[cat.key]} 
                    onChange={(e) => setConfig({...config, [cat.key]: e.target.value})} 
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm" 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-all"
            >
              <RotateCcw size={14} />
              Restaurer défauts
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-purple-500/20"
            >
              {saving ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Enregistrer les critères
            </button>
          </div>

        </form>
    </div>
  );
}
