import { School, Users, Key, Database, ArrowRight, ShieldCheck, Cloud } from "lucide-react";
import Link from "next/link";


export const dynamic='force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <School size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">Schoolab <span className="text-blue-600">Cloud</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Se connecter</Link>
          <Link href="/admin" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">Portail Admin</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-blue-100 shadow-sm">
            <ShieldCheck size={14} />
            Plateforme de gestion centralisée v2
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto leading-tight">
            Pilotez votre réseau d&apos;écoles depuis le <span className="text-blue-600">Cloud</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Gérez les licences, synchronisez les notes et analysez les performances de vos établissements en temps réel avec une solution hybride unique.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <button className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group text-lg">
              Commencer <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all text-lg shadow-sm">
              Documentation
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <FeatureCard 
            icon={<Key className="text-blue-600" />} 
            title="Gestion des Licences" 
            description="Émettez et révoquez des clés d'activation liées au Hardware ID unique de chaque machine."
          />
          <FeatureCard 
            icon={<Cloud className="text-indigo-600" />} 
            title="Sync Temps Réel" 
            description="Synchronisation bidirectionnelle intelligente avec résolution automatique de conflits."
          />
          <FeatureCard 
            icon={<Users className="text-emerald-600" />} 
            title="Suivi Réseau" 
            description="Tableau de bord centralisé pour visualiser la progression de toutes vos écoles."
          />
          <FeatureCard 
            icon={<Database className="text-purple-600" />} 
            title="Backups Cloud" 
            description="Vos données SQLite locales sont sauvegardées et restaurables à tout moment."
          />
        </div>

        {/* Highlight Section */}
        <div className="relative overflow-hidden bg-slate-900 rounded-[40px] p-8 md:p-16 text-white text-center shadow-3xl">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent opacity-50"></div>
           <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Prêt pour le futur de l&apos;éducation ?</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Rejoignez des dizaines d&apos;établissements qui utilisent déjà School Lab pour simplifier leur gestion quotidienne.
              </p>
              <div className="pt-4">
                 <Link href="/admin" className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-xl">
                    Tableau de bord Admin <ArrowRight size={18} />
                 </Link>
              </div>
           </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-slate-200 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-200 rounded text-slate-700">
                <School size={16} />
              </div>
              <span className="font-bold text-slate-800">School Lab</span>
           </div>
           <p className="text-slate-500 text-sm">© 2026 School lab. Développé pour une éducation moderne.</p>
           <div className="flex gap-4 text-sm text-slate-500 font-medium">
              <a href="#" className="hover:text-blue-600 transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Conditions</a>
           </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group bg-white border border-slate-200 p-8 rounded-4xl shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-300">
      <div className="p-4 bg-slate-50 rounded-2xl w-fit mb-6 group-hover:bg-blue-50 transition-colors">{icon}</div>
      <h3 className="font-bold text-slate-900 text-xl mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
