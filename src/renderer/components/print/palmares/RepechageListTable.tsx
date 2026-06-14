import React from 'react';
import { RankedStudent } from '../../../types/palmares';

interface Props {
  displayedStudents: RankedStudent[];
}

/**
 * Tableau imprimable de la liste de repêchage.
 * 
 * Règle d'affichage :
 *  - Si l'élève est marqué "Voir Bureau" sur une matière → afficher "VB" en rouge à la place des points
 *  - Sinon → afficher les matières échouées (Repêchage) et manquantes (Session unique)
 */
export const RepechageListTable: React.FC<Props> = ({ displayedStudents }) => {
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

          // Vérifier si cet élève a des matières "Voir Bureau"
          const hasVoirBureau = rankedStudent.voirBureauSubjects && rankedStudent.voirBureauSubjects.length > 0;

          return (
            <tr key={rankedStudent.student.id} className="border border-black font-semibold leading-none">
              <td className="border border-black px-1.5 py-0 text-center">{index + 1}.</td>
              <td className="border border-black px-2.5 py-0">
                {rankedStudent.student.last_name} {rankedStudent.student.post_name} {rankedStudent.student.first_name}
              </td>

              {/* Colonne Repêchage : remplacer par VOIR BUREAU si l'élève a une dette */}
              <td className="border border-black px-2.5 py-0 text-center text-black">
                {hasVoirBureau ? (
                  // Afficher "VOIR BUREAU" en gras et souligné pour cet élève
                  <span className="font-black uppercase underline">
                    Voir Bureau
                  </span>
                ) : (
                  failed
                )}
              </td>

              {/* Colonne Session unique : idem, masquer si VB */}
              <td className="border border-black px-2.5 py-0 text-center text-black">
                {hasVoirBureau ? (
                  // Cellule vide : le message VB est déjà dans la colonne précédente
                  <span className="text-black/30 text-xs italic">—</span>
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
