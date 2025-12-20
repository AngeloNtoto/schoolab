import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Trash2, Edit, Wifi } from 'lucide-react';
import Tutorial from './Tutorial';
import ContextMenu from './ContextMenu';
import DeleteConfirmModal from './DeleteConfirmModal';
import { classService, ClassData } from '../services/classService';
import EditClassModal from './EditClassModal';
import { useToast } from '../context/ToastContext';
import { getClassDisplayName } from '../lib/classUtils';

interface Class {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
  academic_year_id?: number;
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
  const toast = useToast();

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
      setSchoolName(schoolData[0]?.value || 'Ecole');
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Erreur lors du chargement du tableau de bord.');
    } finally {
      setLoading(false);
    }
  };


  const handleContextMenu = (e: React.MouseEvent, cls: Class) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, classId: cls.id });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleDeleteClass = async () => {
    if (!deleteModal) return;
    
    try {
      await window.api.db.execute('DELETE FROM classes WHERE id = ?', [deleteModal.id]);
      await loadData();
      setDeleteModal(null);
      toast.success('Classe supprimée avec succès');
    } catch (error) {
      console.error('Failed to delete class:', error);
      toast.error('Erreur lors de la suppression de la classe');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'url(/assets/watermark.png)',
          backgroundSize: '400px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg relative">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <GraduationCap size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{schoolName}</h1>
                <p className="text-blue-100 font-medium">Tableau de bord</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/network')}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 backdrop-blur-sm border border-white/10"
              >
                <Wifi size={20} />
                Réseau
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-blue-600 px-6 py-2.5 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-lg flex items-center gap-2"
              >
                <Users size={20} />
                Nouvelle Classe
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.map((cls) => (
            <div 
              key={cls.id}
              onClick={() => navigate(`/class/${cls.id}`)}
              onContextMenu={(e) => handleContextMenu(e, cls)}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditModal(cls);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Edit size={18} />
                </button>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <Users className="text-blue-600" size={24} />
                </div>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                  {cls.academic_year_id ? '2025-2026' : 'N/A'}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                {getClassDisplayName(cls.level, cls.option, cls.section)}
              </h3>
              <p className="text-slate-500 text-sm font-medium">
                {cls.level} • {cls.option}
              </p>
            </div>
          ))}
        </div>

        {classes.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users size={40} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Aucune classe</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
              Commencez par créer votre première classe pour gérer vos élèves et leurs notes.
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg inline-flex items-center gap-2"
            >
              <Users size={20} />
              Créer une classe
            </button>
          </div>
        )}
      </main>

      <Tutorial
        pageId="dashboard"
        steps={[
          {
            title: "Bienvenue sur Ecole !",
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
          onClose={closeContextMenu}
          items={[
            {
              label: 'Ouvrir',
              icon: <GraduationCap size={18} />,
              onClick: () => {
                const cls = classes.find(c => c.id === contextMenu.classId);
                if (cls) navigate(`/class/${cls.id}`);
                closeContextMenu();
              }
            },
            { divider: true },
            {
              label: 'Modifier',
              icon: <Edit size={18} />,
              onClick: () => {
                const cls = classes.find(c => c.id === contextMenu.classId);
                if (cls) setEditModal(cls);
                closeContextMenu();
              }
            },
            {
              label: 'Supprimer',
              icon: <Trash2 size={18} />,
              danger: true,
              onClick: () => {
                const cls = classes.find(c => c.id === contextMenu.classId);
                if (cls) setDeleteModal({ id: cls.id, name: getClassDisplayName(cls.level, cls.option, cls.section) });
                closeContextMenu();
              }
            }
          ]}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          isOpen={!!deleteModal}
          title="Supprimer la classe"
          message={`Êtes-vous sûr de vouloir supprimer la classe ${deleteModal.name} ? Cette action est irréversible.`}
          onConfirm={handleDeleteClass}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {editModal && (
        <EditClassModal
          classData={editModal}
          onClose={() => setEditModal(null)}
          onSuccess={() => {
            loadData();
            setEditModal(null);
            toast.success('Classe modifiée avec succès');
          }}
        />
      )}

      {showCreateModal && (
        <EditClassModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadData();
            setShowCreateModal(false);
            toast.success('Classe créée avec succès');
          }}
        />
      )}
    </div>
  );
}
