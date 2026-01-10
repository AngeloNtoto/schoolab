import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PopulateTestData() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handlePopulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await (window as any).api.db.populateTestData();
      setResult(res);
      console.log('Population result:', res);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to populate test data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6">Populate Test Data</h1>
          
          <p className="mb-6 text-slate-600">
            This will create 100 test students with random grades in a "Test Class".
            Each student will have grades for all subjects across all periods (P1, P2, EXAM1, P3, P4, EXAM2).
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
              <strong>Error:</strong> {error}
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6">
              <strong>Success!</strong> Created 100 students in class ID: {result.classId}
              <button
                onClick={() => navigate(`/class/${result.classId}`)}
                className="block mt-2 text-green-700 underline hover:text-green-900"
              >
                View Test Class →
              </button>
            </div>
          )}

          <button
            onClick={handlePopulate}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {loading ? 'Populating database...' : 'Populate Test Data'}
          </button>

          <div className="mt-4">
            <button
              onClick={() => navigate('/')}
              className="text-slate-600 hover:text-slate-900"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
