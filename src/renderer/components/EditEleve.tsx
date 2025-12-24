import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService, Student } from '../services/studentService';
import { useToast } from '../context/ToastContext';


const EditEleve: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();
    const [isAbandon,setIsAbandon]=useState<Number | Boolean>();
    const [formData, setFormData] = useState<Partial<Student>>({
        first_name: '',
        last_name: '',
        post_name: '',
        gender: '',
        birth_date: '',
        birthplace: '',
        conduite: '',
        conduite_p1: '',
        conduite_p2: '',
        conduite_p3: '',
        conduite_p4: '',
        class_id: undefined,
        is_abandoned: false,
        abandon_reason: '',
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
                conduite: data.conduite ?? '',
                conduite_p1: (data as any).conduite_p1 ?? '',
                conduite_p2: (data as any).conduite_p2 ?? '',
                conduite_p3: (data as any).conduite_p3 ?? '',
                conduite_p4: (data as any).conduite_p4 ?? '',
                class_id: data.class_id,
                is_abandoned: (data as any).is_abandoned ? true : false,
                abandon_reason: (data as any).abandon_reason ?? '',
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
                    conduite: formData.conduite,
                    conduite_p1: (formData as any).conduite_p1,
                    conduite_p2: (formData as any).conduite_p2,
                    conduite_p3: (formData as any).conduite_p3,
                    conduite_p4: (formData as any).conduite_p4,
                    is_abandoned: (formData as any).is_abandoned,
                    abandon_reason: (formData as any).abandon_reason,
            });
            setIsAbandon(formData.is_abandoned);
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
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Conduite — évaluations par période</label>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {[
                            { key: 'conduite_p1', label: 'P1' },
                            { key: 'conduite_p2', label: 'P2' },
                            { key: 'conduite_p3', label: 'P3' },
                            { key: 'conduite_p4', label: 'P4' },
                        ].map(({ key, label }) => (
                            <div key={key}>
                                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                                <select name={key} value={(formData as any)[key] || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                                    <option value="">--</option>
                                    <option value="excellent">Excellent</option>
                                    <option value="tres bien">Très bien</option>
                                    <option value="bien">Bien</option>
                                    <option value="mauvais">Mauvais</option>
                                    <option value="mediocre">Médiocre</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 justify-end pt-4">
                    <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg border">Annuler</button>
                    </div>

                <div className="mt-4 border-t pt-4">
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={(formData as any).is_abandoned ? true : false}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_abandoned: e.target.checked }))}
                            className="h-5 w-5 rounded-md text-red-600"
                        />
                        <span className="text-sm font-medium text-slate-700">Élève en situation d'abandon</span>
                    </label>

                    {(formData as any).is_abandoned && (
                        <div className="mt-3">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cause de l'abandon (optionnel)</label>
                            <textarea
                                name="abandon_reason"
                                value={(formData as any).abandon_reason || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, abandon_reason: e.target.value }))}
                                className="w-full px-4 py-2 border rounded-lg"
                                rows={3}
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-3 justify-end pt-4">
                        <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg border">Annuler</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Enregistrer</button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditEleve;