import { getTauriAPI } from './tauriBridge';

export interface PredictionResult {
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  period: string;
  predictedGrade: number;
  maxGrade: number;
  confidence: number;
  reasoning: string;
}

export interface PredictionParams {
  classId: number;
  studentIds?: number[];
  subjectIds?: number[];
  periods?: string[];
  confidenceThreshold: number;
}

export const predictionService = {
  predictMissingGrades: async (params: PredictionParams): Promise<PredictionResult[]> => {
    const api = await getTauriAPI();
    // IMPORTANT : Tauri v2 attend un objet dont les clés correspondent aux noms des paramètres Rust.
    // La commande Rust est : predict_missing_grades(app_handle, params: PredictionParams)
    // Donc on doit passer { params } et non params directement.
    return await api?.invoke('predict_missing_grades', { params }) ?? [];
  }
};
