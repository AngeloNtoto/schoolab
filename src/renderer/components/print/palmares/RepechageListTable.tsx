import React from 'react';
import { RankedStudent } from '../../../types/palmares';

interface Props {
  displayedStudents: RankedStudent[];
  /**
   * Si true (défaut), affiche "Voir Bureau" à la place des matières pour les élèves VB.
   * Si false, on ignore le statut VB et on affiche les matières échouées/manquantes normalement.
   * Utile pour imprimer la liste sans tenir compte du VB.
   */
  showVoirBureau?: boolean;
}

/**
 * Tableau imprimable de la liste de repêchage.
 *
 * Règle d'affichage :
 *  - Si showVoirBureau=true ET l'élève est marqué "Voir Bureau" → afficher "VOIR BUREAU" à la place
 *  - Sinon → afficher les matières échouées (Repêchage) et manquantes (Session unique) normalement
 */
export const RepechageListTable: React.FC<Props> = ({
  displayedStudents,
  showVoirBureau = true  // Par défaut on respecte le statut VB
}) => {
  return (
    <table className="w-full border-collapse border border-black text-[14px] text-black">
      <thead>
        <tr className="font-bold text-black border border-black">
          <th className="border border-black px-1.5 py-1 w-10 text-center">N°</th>
          <th className="border border-black px-2.5 py-1 text-left">Nom et PostNom</th>
          <th className="border border-black px-2.5 py-1 text-center">Repêchage</th>
          <th className="border border-black px-2.5 py-1 text-center">Session - unique</th>
        </tr>
      </thead>

      <tbody>
        {displayedStudents.map((rankedStudent, index) => {
          const missing = rankedStudent.missingSubjects.join(', ');
          const failed = rankedStudent.failedSubjects.join(', ');

          // Vérifier si cet élève a des matières "Voir Bureau" ET si on doit les afficher
          const hasVoirBureau =
            showVoirBureau &&
            rankedStudent.voirBureauSubjects &&
            rankedStudent.voirBureauSubjects.length > 0;

          return (
            <tr key={rankedStudent.student.id} className="border border-black font-semibold leading-none">
              <td className="border border-black px-1.5 py-0 text-center">{index + 1}.</td>
              <td className="border border-black px-2.5 py-0">
                {rankedStudent.student.last_name} {rankedStudent.student.post_name} {rankedStudent.student.first_name}
              </td>

              {/* Colonne Repêchage : si VB activé ET pris en compte → afficher "VOIR BUREAU" */}
              <td className="border border-black px-2.5 py-0 text-center text-black">
                {hasVoirBureau ? (
                  <span className="font-black">Voir Bureau</span>
                ) : (
                  failed
                )}
              </td>

              {/* Colonne Session unique : idem, masquer si VB pris en compte */}
              <td className="border border-black px-2.5 py-0 text-center text-black">
                {hasVoirBureau ? (
                  <span className="font-black">Voir Bureau</span>
                ) : (
                  missing
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
