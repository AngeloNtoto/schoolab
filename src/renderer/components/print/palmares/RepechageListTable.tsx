import React from 'react';
import { RankedStudent } from '../../../types/palmares';

interface Props {
  displayedStudents: RankedStudent[];
}

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

          return (
            <tr key={rankedStudent.student.id} className="border border-black font-semibold leading-none">
              <td className="border border-black px-1.5 py-0 text-center">{index + 1}.</td>
              <td className="border border-black px-2.5 py-0">
                {rankedStudent.student.last_name} {rankedStudent.student.post_name} {rankedStudent.student.first_name}
              </td>
              <td className="border border-black px-2.5 py-0 text-center text-black">{failed}</td>
              <td className="border border-black px-2.5 py-0 text-center text-black">{missing}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
