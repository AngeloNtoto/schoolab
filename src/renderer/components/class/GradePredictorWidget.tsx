import React, { useState } from 'react';
import { GradePredictorButton } from './GradePredictorButton';
import { GradePredictorModal } from './GradePredictorModal';
import { useGradePredictor } from '../../hooks/useGradePredictor';
import { PredictionResult } from '../../services/predictionService';
import { gradeService } from '../../services/gradeService';

interface GradePredictorWidgetProps {
  classId: number;
  // Matières : on accepte aussi bien les Subject complets que des objets {id, name}
  subjects: Array<{ id: number; name: string; [key: string]: any }>;
  // Élèves : on accepte le type Student complet (avec first_name, last_name)
  students: Array<{ id: number; first_name?: string; last_name?: string; name?: string; [key: string]: any }>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const GradePredictorWidget: React.FC<GradePredictorWidgetProps> = ({
  classId,
  subjects,
  students,
  onSuccess,
  onError
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { loading, error, results, predict, reset } = useGradePredictor();

  /**
   * Normalise la liste des élèves en format {id, name} pour le modal.
   * Gère les deux formats : {name} ou {first_name, last_name}
   */
  const normalizedStudents = students.map(s => ({
    id: s.id,
    name: s.name ?? `${s.last_name ?? ''} ${s.first_name ?? ''}`.trim()
  }));

  const handlePredict = async (params: any) => {
    try {
      await predict(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la prédiction';
      onError?.(message);
    }
  };

  const handleApply = async (applicableResults: PredictionResult[]) => {
    try {
      // Importer les notes prédites dans la base de données
      await gradeService.importPredictedGrades(applicableResults);
      onSuccess?.();
      setIsModalOpen(false);
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'import";
      onError?.(message);
      throw err;
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    // Réinitialiser les résultats uniquement si on ferme sans appliquer
    reset();
  };

  return (
    <>
      <GradePredictorButton
        onClick={() => setIsModalOpen(true)}
        disabled={loading}
      />
      <GradePredictorModal
        isOpen={isModalOpen}
        isLoading={loading}
        results={results}
        error={error}
        classId={classId}
        subjects={subjects}
        students={normalizedStudents}
        onPredict={handlePredict}
        onApply={handleApply}
        onClose={handleClose}
      />
    </>
  );
};
