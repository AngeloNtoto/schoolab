import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Trash2, Edit } from 'lucide-react';
import Tutorial from './Tutorial';
import ContextMenu from './ContextMenu';
import DeleteConfirmModal from './DeleteConfirmModal';
import EditClassModal from './EditClassModal';
import { getClassDisplayName } from '../lib/classUtils';

interface Class {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; classId: number } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: number; name: string } | null>(null);
  const [editModal, setEditModal] = useState<Class | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [classesData, schoolData] = await Promise.all([
        window.api.db.query<Class>('SELECT * FROM classes ORDER BY level, section'),
        window.api.db.query<{ value: string }>("SELECT value FROM settings WHERE key = 'school_name'"),
      ]);

      setClasses(classesData);
      setSchoolName(schoolData[0]?.value || 'EcoleGest');
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleContextMenu = (e: React.MouseEvent, cls: Class) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, classId: cls.id });
  };

  const handleDeleteClass = async () => {
    if (!deleteModal) return;
    
    try {
      await window.api.db.execute('DELETE FROM classes WHERE id = ?', [deleteModal.id]);
      await loadData();
      setDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete class:', error);
      alert('Erreur lors de la suppression de la classe');
    }
  };

  // Show content immediately, no loading screen

  return (
    <>
      <Tutorial
        pageId="dashboard"
        steps={[
          {
            title: "Bienvenue sur EcoleGest !",
            content: "Votre tableau de bord affiche toutes vos classes.\n\nVous êtes au cœur de votre système de gestion scolaire. Ici, vous avez une vue d'ensemble de toutes les classes que vous gérez."
          },
          {
            title: "Navigation facile",
            content: "Cliquez simplement sur une carte de classe pour accéder :\n\n• À la liste des élèves\n• À la grille de notes\n• Aux rapports et bulletins\n• Au palmarès de la classe\n\nTout est centralisé dans une interface simple et intuitive."
          },
          {
            title: "Prochaines étapes",
            content: "Pour commencer :\n\n1️⃣ Cliquez sur une classe\n2️⃣ Ajoutez ou importez vos élèves\n3️⃣ Saisissez les notes dans la grille\n4️⃣ Générez les bulletins\n\nC'est aussi simple que ça !"
          }
        ]}
        onComplete={() => {}}
      />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            {
              label: 'Ouvrir',
              icon: <GraduationCap size={18} />,
              onClick: () => {
                const cls = classes.find(c => c.id === contextMenu.classId);
                if (cls) navigate(`/class/${cls.id}`);
              }
            },
            { divider: true },
            {
              label: 'Modifier',
              icon: <Edit size={18} />,
              onClick: () => {
                const cls = classes.find(c => c.id === contextMenu.classId);
                if (cls) setEditModal(cls);
              }
            },
            {
              label: 'Supprimer',
              icon: <Trash2 size={18} />,
              danger: true,
              onClick: () => {
                const cls = classes.find(c => c.id === contextMenu.classId);
                if (cls) setDeleteModal({ id: cls.id, name: cls.name });
              }
            }
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
      {deleteModal && (
        <DeleteConfirmModal
          title="Supprimer la classe"
          message="Êtes-vous sûr de vouloir supprimer cette classe ? Tous les élèves et notes associés seront également supprimés."
          itemName={deleteModal.name}
          onConfirm={handleDeleteClass}
          onCancel={() => setDeleteModal(null)}
        />
      )}
      {editModal && (
        <EditClassModal
          classData={editModal}
          onClose={() => setEditModal(null)}
          onSuccess={loadData}
        />
      )}
      {showCreateModal && (
        <EditClassModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />
      )}
    <div className="min-h-screen bg-slate-50 relative">
      {/* Watermark Background */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'url(/assets/watermark.png)',
          backgroundSize: '400px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg relative">
        <div className="max-w-[95%] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <GraduationCap className="text-white" size={40} />
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold">{schoolName}</h1>
                <p className="text-blue-100 mt-1">Tableau de bord - Gestion Scolaire</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors flex items-center gap-2 font-medium"
            >
              <div className="bg-white text-blue-600 rounded-full p-1">
                <Users size={14} />
              </div>
              Ajouter une classe
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[95%] mx-auto px-8 py-8 relative">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Vos Classes</h2>
          <p className="text-slate-600">Cliquez sur une classe pour accéder à sa gestion détaillée</p>
        </div>

        {classes.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-20 text-center">
            <Users className="mx-auto text-slate-300 mb-4" size={80} />
            <h3 className="text-xl font-medium text-slate-600 mb-2">Aucune classe</h3>
            <h3 className="text-xl font-medium text-slate-600 mb-2">Aucune classe</h3>
            <p className="text-slate-500 mb-6">Commencez par créer votre première classe</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Créer une classe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => navigate(`/class/${cls.id}`)}
                onContextMenu={(e) => handleContextMenu(e, cls)}
                className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-2xl hover:scale-105 transition-all duration-300 p-8 text-left group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100 transition-colors" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Users size={28} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {cls.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-1">{cls.level}</p>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Cliquez pour ouvrir</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white">
                        →
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
    </>
  );
}
