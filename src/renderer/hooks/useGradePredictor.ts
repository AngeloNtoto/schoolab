import { useState } from 'react';
import { predictionService, PredictionResult, PredictionParams } from '../services/predictionService';

interface UsePredictorState {
  loading: boolean;
  error: string | null;
  results: PredictionResult[];
}

export const useGradePredictor = () => {
  const [state, setState] = useState<UsePredictorState>({
    loading: false,
    error: null,
    results: []
  });

  const predict = async (params: PredictionParams) => {
    setState({ loading: true, error: null, results: [] });
    try {
      const results = await predictionService.predictMissingGrades(params);
      setState({ loading: false, error: null, results });
      return results;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Erreur lors de la prédiction';
      setState({ loading: false, error, results: [] });
      throw err;
    }
  };

  const reset = () => {
    setState({ loading: false, error: null, results: [] });
  };

  return { ...state, predict, reset };
};
