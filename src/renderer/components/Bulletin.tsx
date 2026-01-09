import { ClassData, Subject } from '../services/classService';
import { Student } from '../services/studentService';
import { Grade } from '../services/gradeService';
import { Domain } from '../services/domainService';

// Bulletin Components
import BulletinHumanites from './BulletinHumanites';
import BulletinPrimaire from './BulletinPrimaire';

interface BulletinProps {
  studentId: number | null;
  classInfo: ClassData;
  students: Student[];
  subjects: Subject[];
  domains?: Domain[]; // Optionnel car seulement pour primaire
  grades: Grade[];
  schoolName: string;
  schoolCity: string;
  onClose: () => void;
}

export default function Bulletin(props: BulletinProps) {
  const { classInfo } = props;
  
  // Détermine si c'est une classe primaire (7ème ou 8ème)
  const isPrimaire = classInfo.level === '7ème' || classInfo.level === '8ème';

  // Rendre le bulletin approprié selon le niveau
  if (isPrimaire) {
    return <BulletinPrimaire {...props} />;
  } else {
    return <BulletinHumanites {...props} />;
  }
}
