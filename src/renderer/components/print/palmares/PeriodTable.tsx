import React from 'react';
import { RankedStudent, Period } from '../../../types/palmares';
import { StudentObservation } from './StudentObservation';

interface Props {
  displayedStudents: RankedStudent[];
  stats: any;
  categoryLabels: Record<number, string>;
  selectedPeriod: Period;
}

export const PeriodTable: React.FC<Props> = ({
  displayedStudents,
  stats,
  categoryLabels,
  selectedPeriod,
}) => {
  return (
    <table className="w-full border-collapse border border-black text-[13px] text-black">
      <thead>
        <tr className="font-bold text-black border border-black uppercase text-[12px]">
          <th className="border border-black px-1.5 py-1 w-8 text-center">N°</th>
          <th className="border border-black px-2.5 py-1 text-left">NOMS ET POST NOMS</th>
          <th className="border border-black px-1.5 py-1 w-12 text-center">%</th>
          <th className="border border-black px-2.5 py-1 text-center">CONDUITE</th>
          <th className="border border-black px-2.5 py-1 text-left">OBSERVATION</th>
        </tr>
      </thead>
      <tbody>
        {displayedStudents.map((rankedStudent, index) => {
          const prev = index > 0 ? displayedStudents[index - 1] : null;
          const isNewCat = !prev || prev.category !== rankedStudent.category;

          let catCount = 0;
          if (rankedStudent.category === 1) catCount = stats.cat1;
          if (rankedStudent.category === 2) catCount = stats.cat2;
          if (rankedStudent.category === 3) catCount = stats.cat3;
          if (rankedStudent.category === 4) catCount = stats.cat4;
          if (rankedStudent.category === 5) catCount = stats.cat5;

          const pctStr = stats.total > 0 ? ((catCount / stats.total) * 100).toFixed(1).replace('.0', '') : '0';

          let conduite = '-';
          if (selectedPeriod === 'P1') conduite = rankedStudent.student.conduite_p1 || '-';
          else if (selectedPeriod === 'P2' || selectedPeriod === 'SEM1' || selectedPeriod === 'EXAM1') conduite = rankedStudent.student.conduite_p2 || '-';
          else if (selectedPeriod === 'P3') conduite = rankedStudent.student.conduite_p3 || '-';
          else if (selectedPeriod === 'P4' || selectedPeriod === 'SEM2' || selectedPeriod === 'EXAM2') conduite = rankedStudent.student.conduite_p4 || '-';

          return (
            <React.Fragment key={rankedStudent.student.id}>
              {isNewCat && (
                <tr className="bg-slate-100 border-y border-black font-bold">
                  <td colSpan={5} className="border border-black px-2 py-1 text-center font-bold text-black text-[12px] uppercase">
                    <div className="flex w-full justify-center items-center gap-8">
                      <span>{categoryLabels[rankedStudent.category]}</span>
                      <span>
                        {catCount}/{stats.total} soit {pctStr} %
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              <tr className="border border-black font-semibold leading-none">
                <td className="border border-black px-1.5 py-0 text-center">
                  {rankedStudent.rank.toString().padStart(2, '0')}
                </td>
                <td className="border border-black px-2.5 py-0 uppercase">
                  {rankedStudent.student.last_name} {rankedStudent.student.post_name} {rankedStudent.student.first_name}
                </td>
                <td className="border border-black px-1.5 py-0 text-center text-black">
                  {rankedStudent.category === 4 || rankedStudent.category === 5
                    ? ''
                    : `${rankedStudent.percentage.toFixed(1).replace('.', ',').replace(',0', '')}`}
                </td>
                <td className="border border-black px-2.5 py-0 text-center uppercase">
                  {conduite}
                </td>
                <td className="border border-black px-2.5 py-0">
                  <StudentObservation
                    rankedStudent={rankedStudent}
                    selectedPeriod={selectedPeriod}
                  />
                </td>
              </tr>
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
};
