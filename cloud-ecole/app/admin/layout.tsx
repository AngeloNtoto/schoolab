"use client";

import { School as SchoolIcon, Users, Key, LayoutDashboard } from "lucide-react";
import LogoFull from "@/components/ui/Logo";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800 flex justify-center">
           <LogoFull variant="light" size={28} />
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarLink 
            href="/admin" 
            icon={<LayoutDashboard size={18} />} 
            label="Vue d'ensemble" 
            active={pathname === "/admin"} 
          />
          <SidebarLink 
            href="/admin/schools" 
            icon={<SchoolIcon size={18} />} 
            label="Écoles" 
            active={pathname.startsWith("/admin/schools")} 
          />
          <SidebarLink 
            href="/admin/licenses" 
            icon={<Key size={18} />} 
            label="Licences" 
            active={pathname.startsWith("/admin/licenses")} 
          />
          <SidebarLink 
            href="/admin/users" 
            icon={<Users size={18} />} 
            label="Utilisateurs" 
            active={pathname.startsWith("/admin/users")} 
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 p-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">AD</div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold text-white truncate">Administrateur</p>
                 <p className="text-xs text-slate-500 truncate">admin@schoolab.edu</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8">
           <h2 className="font-bold text-slate-800">
              {pathname === "/admin" && "Tableau de Bord"}
              {pathname.startsWith("/admin/schools") && "Gestion des Établissements"}
              {pathname.startsWith("/admin/licenses") && "Gestion des Licences"}
              {pathname.startsWith("/admin/users") && "Utilisateurs Panel"}
           </h2>
           <button className="text-sm text-slate-500 hover:text-slate-800">Déconnexion</button>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
          : 'hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
