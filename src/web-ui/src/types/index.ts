export interface Class {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  post_name: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  max_p1: number;
  max_p2: number;
  max_exam1: number;
  max_p3: number;
  max_p4: number;
  max_exam2: number;
}

export interface Grade {
  student_id: number;
  subject_id: number;
  period: string;
  value: number;
}
