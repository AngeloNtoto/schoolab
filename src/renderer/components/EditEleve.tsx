import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService, Student } from '../services/studentService';
import { useToast } from '../context/ToastContext';

const EditEleve: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();

    const [formData, setFormData] = useState<Partial<Student>>({
        first_name: '',
        last_name: '',
        post_name: '',
        gender: '',
        birth_date: '',
        birthplace: '',
        class_id: undefined,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        fetchEleve(Number(id));
    }, [id]);

    const fetchEleve = async (studentId: number) => {
        try {
            const data = await studentService.getStudentById(studentId);
            if (!data) {
                setError('Élève introuvable');
                setLoading(false);
                return;
            }
            setFormData({
                first_name: data.first_name,
                last_name: data.last_name,
                post_name: data.post_name,
                gender: data.gender,
                birth_date: data.birth_date,
                birthplace: data.birthplace,
                class_id: data.class_id,
            });
        } catch (err) {
            console.error(err);
            setError('Erreur lors du chargement de l\'élève');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!id) return;
        try {
            await studentService.updateStudent(Number(id), {
                first_name: formData.first_name,
                last_name: formData.last_name,
                post_name: formData.post_name,
                gender: formData.gender,
                birth_date: formData.birth_date,
                birthplace: formData.birthplace,
            });
            toast.success('Élève mis à jour');
            navigate(-1);
        } catch (err) {
            console.error(err);
            setError('Erreur lors de la mise à jour');
            toast.error('Erreur lors de la mise à jour');
        }
    };

    if (loading) return <div className="p-6">Chargement…</div>;

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Éditer l'élève</h2>
            {error && <div className="text-red-600 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                        <input name="last_name" value={formData.last_name || ''} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                        <input name="first_name" value={formData.first_name || ''} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Post-nom</label>
                    <input name="post_name" value={formData.post_name || ''} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sexe</label>
                        <select name="gender" value={formData.gender || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                            <option value="">--</option>
                            <option value="M">Masculin</option>
                            <option value="F">Féminin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date de naissance</label>
                        <input type="date" name="birth_date" value={formData.birth_date || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Lieu de naissance</label>
                        <input name="birthplace" value={formData.birthplace || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                </div>

                <div className="flex items-center gap-3 justify-end pt-4">
                    <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg border">Annuler</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Enregistrer</button>
                </div>
            </form>
        </div>
    );
};

export default EditEleve;