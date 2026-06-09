import React from 'react';
import { RankedStudent, Period, PalmaresMode } from '../../../types/palmares';

export const StudentObservation = ({
  rankedStudent,
  selectedPeriod,
  palmaresMode,
}: {
  rankedStudent: RankedStudent;
  selectedPeriod: Period;
  palmaresMode?: PalmaresMode;
}) => {
  const student = rankedStudent.student;

  // =========================
  // ABANDON
  // =========================
  if (student.is_abandoned) {
    return (
      <span className="text-red-700 font-bold text-[12px] uppercase">
        Abandon {student.abandon_reason ? `: ${student.abandon_reason}` : ''}
      </span>
    );
  }

  // =========================
  // ANNUEL
  // =========================
  if (selectedPeriod === 'ANNUAL') {
    // Catégorie 1 et 3 = vide
    if (rankedStudent.category === 1 || rankedStudent.category === 3) {
      return null;
    }

    // =========================
    // Catégorie 2
    // Avant délibération : Ont réussis avec des échecs (affichage des échecs)
    // Après délibération : Passe en deuxième session (affichage des repêchages)
    // =========================
    if (rankedStudent.category === 2) {
      if (palmaresMode === 'BEFORE_DELIBERATION') {
        const details = rankedStudent.subjectDetails.filter((s: any) =>
          rankedStudent.failedSubjects.includes(s.subjectCode || s.subjectName)
        );
        return (
          <div className="text-black text-[12px] font-semibold leading-tight">
            {details.map((s) => `${s.subjectCode || s.subjectName} ${((s.points / s.maxPoints) * 100).toFixed(1).replace('.0', '')}%`).join('; ')}
          </div>
        );
      } else {
        const details = rankedStudent.subjectDetails.filter((s: any) =>
          rankedStudent.repechageSubjects.includes(s.subjectCode || s.subjectName)
        );
        return (
          <div className="text-black text-[12px] font-semibold leading-tight">
            {details.map((s) => `${s.subjectCode || s.subjectName} ${((s.points / s.maxPoints) * 100).toFixed(1).replace('.0', '')}%`).join('; ')}
          </div>
        );
      }
    }

    // Catégorie 5 = non classés
    if (rankedStudent.category === 5) {
      const missing: string[] = [];
      const failed: string[] = [];

      for (let i = 0; i < rankedStudent.subjectDetails.length; i++) {
        const detail = rankedStudent.subjectDetails[i];
        const name = detail.subjectCode || detail.subjectName;

        if (rankedStudent.missingSubjects.includes(name)) {
          missing.push(name);
        } else if (
          rankedStudent.failedSubjects.includes(name) ||
          rankedStudent.repechageSubjects.includes(name)
        ) {
          failed.push(`${name} ${((detail.points / detail.maxPoints) * 100).toFixed(1).replace('.0', '')}%`);
        }
      }

      return (
        <div className="flex flex-col text-black text-[12px] leading-tight space-y-0.5">
          {missing.length > 0 && <span className="font-bold">{missing.join(', ')}</span>}
          {failed.length > 0 && (
            <span className="font-bold italic text-black">{failed.join(' ; ')}</span>
          )}
        </div>
      );
    }

    return null;
  }

  // =========================
  // SEMESTRES / PERIODES
  // =========================

  // Catégorie 1 = rien
  if (rankedStudent.category === 1) {
    return null;
  }

  // =========================
  // Catégorie 2
  // Affichage des échecs uniquement (avec notes)
  // =========================
  if (rankedStudent.category === 2) {
    const failedDetails = rankedStudent.subjectDetails.filter((s) =>
      rankedStudent.failedSubjects.includes(s.subjectCode || s.subjectName)
    );

    return (
      <div className="text-black text-[12px] font-semibold leading-tight">
        {failedDetails.map((s) => `${s.subjectCode || s.subjectName} ${((s.points / s.maxPoints) * 100).toFixed(1).replace('.0', '')}%`).join(' ; ')}
      </div>
    );
  }

  // =========================
  // Catégorie 3 = Ont échoués
  // Aucun cours affiché
  // =========================
  if (rankedStudent.category === 3) {
    return null;
  }

  // =========================
  // Catégorie 5 = non classés
  // =========================
  if (rankedStudent.category === 5) {
    const missing: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < rankedStudent.subjectDetails.length; i++) {
      const detail = rankedStudent.subjectDetails[i];
      const name = detail.subjectCode || detail.subjectName;

      if (rankedStudent.missingSubjects.includes(name)) {
        missing.push(name);
      } else if (rankedStudent.failedSubjects.includes(name)) {
        failed.push(`${name}`);
      }
    }

    return (
      <div className="flex flex-col text-[12px] leading-tight space-y-0.5">
        {missing.length > 0 && <span className="font-medium text-black">{missing.join(', ')}</span>}
        {failed.length > 0 && <span className="font-bold italic text-black">{failed.join(' ; ')}</span>}
      </div>
    );
  }

  return null;
};
