import 'dotenv/config';
import { getAdmin } from './server/firebaseAdmin.js';
async function run() {
  const db = getAdmin().database();
  const m = await db.ref('movies').once('value');
  const g = await db.ref('movieGroups').once('value');
  console.log('Movies:', m.val());
  console.log('Groups:', g.val());
  process.exit(0);
}
run().catch(console.error);
