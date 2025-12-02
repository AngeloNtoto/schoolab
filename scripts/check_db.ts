
import { getDb } from '../src/db';

const db = getDb();
const years = db.prepare('SELECT * FROM academic_years').all();
console.log('Academic Years:', years);
