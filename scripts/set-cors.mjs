import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = join(__dirname, '../serviceAccount.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'xxxx-connection.firebasestorage.app'
});

const bucket = admin.storage().bucket();

const corsConfiguration = [
  {
    origin: ['*'],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAgeSeconds: 3600,
    responseHeader: ['*']
  }
];

async function setCors() {
  try {
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log('CORS configuration successfully set on xxxx-connection.firebasestorage.app!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting CORS configuration:', error);
    process.exit(1);
  }
}

setCors();
