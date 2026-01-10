/**
 * AuthScreen.tsx
 * 
 * This component provides local authentication for the Schoolab application.
 * It handles two states:
 * 1. First run: User creates a new local password.
 * 2. Subsequent runs: User enters their password to unlock the app.
 * 
 * The password is hashed using a simple hash function and stored in local settings.
 * This is a basic security measure to prevent casual unauthorized access.
 */

import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react';

interface AuthScreenProps {
  /** Whether this is the first run (create password) or login */
  isFirstRun: boolean;
  /** Callback when authentication is successful */
  onAuthSuccess: () => void;
  /** Callback to verify password against stored hash */
  onVerifyPassword: (password: string) => Promise<boolean>;
  /** Callback to create new password */
  onCreatePassword: (password: string) => Promise<boolean>;
}

export default function AuthScreen({ 
  isFirstRun, 
  onAuthSuccess, 
  onVerifyPassword, 
  onCreatePassword 
}: AuthScreenProps) {
  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Handle form submission for both create and login modes
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isFirstRun) {
        // Validation for password creation
        if (password.length < 4) {
          setError('Le mot de passe doit contenir au moins 4 caractères.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas.');
          setLoading(false);
          return;
        }

        // Create the password
        const success = await onCreatePassword(password);
        if (success) {
          onAuthSuccess();
        } else {
          setError('Erreur lors de la création du mot de passe.');
        }
      } else {
        // Verify existing password
        const valid = await onVerifyPassword(password);
        if (valid) {
          onAuthSuccess();
        } else {
          setError('Mot de passe incorrect.');
        }
      }
    } catch (err) {
      setError('Une erreur est survenue.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-8"
      style={{
        backgroundImage: 'url(/assets/loading-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
          <div className="bg-white/20 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
            {isFirstRun ? <KeyRound size={40} /> : <Lock size={40} />}
          </div>
          <h1 className="text-2xl font-bold">
            {isFirstRun ? 'Bienvenue sur Schoolab' : 'Déverrouiller l\'application'}
          </h1>
          <p className="text-blue-100 mt-2 text-sm">
            {isFirstRun 
              ? 'Créez un mot de passe pour sécuriser vos données' 
              : 'Entrez votre mot de passe pour continuer'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-12"
                placeholder="••••••••"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only for first run) */}
          {isFirstRun && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Confirmer le mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Chargement...</span>
            ) : (
              <>
                <ShieldCheck size={20} />
                {isFirstRun ? 'Créer le mot de passe' : 'Déverrouiller'}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
            <GraduationCap size={16} />
            <span>Schoolab - Gestion Scolaire</span>
          </div>
        </div>
      </div>
    </div>
  );
}
