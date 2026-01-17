import { dbService } from 'src/renderer/services/databaseService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getClassDisplayName } from 'src/renderer/lib/classUtils';
import { Search,User,Bell } from '../iconsSvg';


export default function TopNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [classes, setClasses] = useState<any[]>([]);
  const [activeYear, setActiveYear] = useState<string>('');
  
  // Quick Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
       // Get active year
       const yearRes = await dbService.query<{name: string, id: number}>('SELECT id, name FROM academic_years WHERE is_active = 1');
       if(yearRes.length > 0) {
           setActiveYear(yearRes[0].name);
           // Get classes for active year
           const clsRes = await dbService.query<any>('SELECT * FROM classes WHERE academic_year_id = ? ORDER BY level, section', [yearRes[0].id]);
           setClasses(clsRes);
       }
    } catch(e) {
        console.error("Failed to load top nav data", e);
    }
  };

  const filteredClasses = classes.filter(c => 
    getClassDisplayName(c.level, c.option, c.section).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPageTitle = () => {
      const p = location.pathname;
      if(p === '/dashboard') return 'Tableau de bord';
      if(p === '/network') return 'Réseau';
      if(p === '/academic-years') return 'Années Académiques';
      if(p === '/settings') return 'Paramètres';
      if(p.startsWith('/class/')) return 'Détails de la classe';
      if(p.startsWith('/notes')) return 'Notes';
      return 'Schoolab Admin';
  };

  return (
    <div className="h-14 bg-white dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-700 flex items-center justify-between px-6 sticky top-0 z-20 shadow-md">
        
        {/* Left: Breadcrumb / Title */}
        <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize">
                {getPageTitle()}
            </h2>
            {activeYear && (
                <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                    {activeYear}
                </span>
            )}
        </div>

        {/* Center: Quick Class Switcher */}
        <div className="relative w-96 hidden md:block group z-50">
            <div className={`flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 border transition-colors ${isSearchOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent'}`}>
                <Search size={18} className="text-slate-400 mr-2" />
                <input 
                    type="text" 
                    placeholder="Aller à une classe..." 
                    className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    // Delay blur to allow clicking on items
                    onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                />
            </div>
            
            {/* Dropdown Results */}
            {isSearchOpen && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                    {filteredClasses.length > 0 ? (
                        filteredClasses.map(cls => (
                            <button
                                key={cls.id}
                                onClick={() => {
                                    navigate(`/class/${cls.id}`);
                                    setSearchQuery('');
                                    setIsSearchOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between border-b border-slate-50 dark:border-slate-700 last:border-0"
                            >
                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                    {getClassDisplayName(cls.level, cls.option, cls.section)}
                                </span>
                                <span className="text-xs text-slate-400">{cls.level}</span>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center text-slate-500 text-sm">
                            Aucune classe trouvée
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button className="flex items-center gap-2 p-1.5 pl-3 pr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-700">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Admin</span>
                <div className="bg-blue-600 text-white p-1 rounded-full">
                    <User size={14} />
                </div>
            </button>
        </div>
    </div>
  );
}
