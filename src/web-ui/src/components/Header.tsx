export default function Header() {
  return (
    <header className="bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
        {/* Titre réduit en taille LG au lieu de 2XL */}
        <div className="flex items-center gap-2">
          <div className="font-serif text-lg font-extrabold tracking-tight">
            Schoolab <span className="text-blue-200 font-medium">Marking Board</span>
          </div>
        </div>
        
        {/* Indicateur de statut plus discret */}
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-100">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          Connecté
        </div>
      </div>
    </header>
  );
}
