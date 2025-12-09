export interface TransferPayload {
  sender: string;
  type: 'GRADES' | 'STUDENTS' | 'CLASS_DATA';
  timestamp: number;
  data: any;
  description?: string;
}

export interface Peer {
  name: string;
  ip: string;
  port: number;
  hostname: string;
}
