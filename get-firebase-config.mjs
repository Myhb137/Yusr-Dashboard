// Script to fetch Firebase web SDK config using service account
// Run: node get-firebase-config.mjs

import { createSign } from 'crypto';
import https from 'https';

const SERVICE_ACCOUNT = {
  project_id: "buraq-b947f",
  private_key_id: "fb8163f8a61d17afe679c7961150242f2df126fd",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDVWcrQpfNJL+s6\noUQiCCjk0dufqtf3bilZbbtuQv4JZDoRqlmq8fpYNQxx7XxMUfHwtBcDWTwdXYdy\n/4V7MqIg1dUTJimgQvttoLMmhT0LRDRtBWMPefjZKbDp5ZqjBxSXkrDk1BJWqa+L\nqdH8/o1EIuvcHCHBJL+QIE9ba203xTqVKiuqe46ZIp+SBOFUbVcyNQIxo7cpG+sA\nf5uza0ujs904jiY2T0G2GeS3iRnF9ZbVVQO6S7vUsx56YsxsP+2fqNvjIbElnU87\nQK6iawyPCNu9dGBfOug5LQifVZByP2DF9m2eXLQAQR8OTT30ODEVY4S5GW4VHCop\n/KRt9EgtAgMBAAECggEAEGr8wcInfuAOYsBiuRi2JuekVjzkKjECwxQ/6mwC1w+s\nrUvV4yMEYBHS/5hmKoxaySpeo/4Ts3HNWNLjf3fFxK+X2kWjSeclqInHh4UUzb9l\npmcV+Kyq8vEzoUgvNnD2y3Q5Ix7Tu3IK5X0/wM+I6O+kBVfv3AhbKnjmCnOxn6ss\neq6cWCegzS5IQWJ4m3ezcJUJnxv8UovYmcobPopknjmAOSkhw05LSemkRRVVbYBE\nS66hsZ/iYdDajxG7rwvGQQoEkUGhpmaBuNhK/ahUwBcoQq4dF/VB5TeeApwDOSYq\nxK3qwBoRR7MxZNvPKkvcpPn95NEwlGRjXaKqlpQEmQKBgQD5zVBF6uiJQY+VRwZp\nHxq0fwPvAJn29oAd7GKJeGOSeHCdvwKxmwIynAu2+mUn5u1SPtkOfPJPr8kz+8Br\n/yms62LySCJWhAkVyeA19QA0SuS94s1MHmdUdyzu4HRd/1x9AuQ7DsWKMQkKxdfW\nDCqeiQAcM6TIh82Mm5xRpnJgWQKBgQDapPLOmb8B5mlOJt26q44BUQ8uhNOEJVn4\nKu7JyYwTCQS2kHu8dj4eJ5LygIoQAZcyE0vbCLTN8AjFtagwSmTafm1mK+jo5lOj\nOTWJNx2KY+WPtNeXuGoAfS4+Tq8nwWGEWhnNcbbYGJ7nRKdneDmvy31qyjUCqzG4\nKpdjOeRL9QKBgAMxsuMR++M1aWaZP+W8NhU0wpIdydo0kLLRQPlNBsjqrVX3CUvI\nFaEcCbJPRVfbRhGVKCVdR6PpNYNqpq062AeUAvHiJj5A9fTHXgySk2wXwREEg2eD\nxAJ6e6KaUCKbj00x6kUvDSuVMO5oVTgxc6IPUmcJ6gN+aQxxOPB6VmARAoGBAJSB\nDo327T48InA7g8SDOzt3tAkTnJqXyAkAGBokc6iGKpZZgkGaSkyu8mcVmTCP9ALG\nCnKl8jAiBcNLxAWwsdmZn3KTBmoR7uLhO5SMQ9s4SLaXzQs27YCRhbQ6O0uUVEjR\n7c6VmuwhpORNxCpKBVx6qR+8Yc8DOgztmM+DhaV1AoGAcoM6O2aagSqA5OKsKNlv\nTQjhfJ8NbLwnZjdxyARbPloPhnu1tmAHOHcOpDCn0gwU9cht6KC/LBZ1W+YlGnip\nChayHOO7JsuO2p+oqy1rC+Bxu43fCZ1gdqw9XnW6sEYHq2M1sgkANUvxdp7beDsX\nLQ7oqpbcvaYqs9txOvKN4Oo=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@buraq-b947f.iam.gserviceaccount.com",
};

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function makeJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: SERVICE_ACCOUNT.client_email,
    sub: SERVICE_ACCOUNT.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
  }));
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(SERVICE_ACCOUNT.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${payload}.${sig}`;
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': data.length }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Getting access token...');
  const tokenRes = await post('https://oauth2.googleapis.com/token',
    `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${makeJWT()}`);

  if (!tokenRes.access_token) {
    console.error('Failed to get token:', tokenRes);
    process.exit(1);
  }

  const token = tokenRes.access_token;
  const projectId = SERVICE_ACCOUNT.project_id;

  console.log('Fetching web apps...');
  const appsRes = await get(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
    token
  );

  if (!appsRes.apps || appsRes.apps.length === 0) {
    console.error('No web apps found in project. Create one in Firebase Console first.');
    process.exit(1);
  }

  // Get config for first web app
  const appName = appsRes.apps[0].name;
  console.log(`Found web app: ${appsRes.apps[0].displayName || appName}`);

  const configRes = await get(
    `https://firebase.googleapis.com/v1beta1/${appName}/config`,
    token
  );

  console.log('\n✅ Firebase Web SDK Config:\n');
  console.log(`VITE_FIREBASE_API_KEY=${configRes.apiKey}`);
  console.log(`VITE_FIREBASE_AUTH_DOMAIN=${configRes.locationId ? `${projectId}.firebaseapp.com` : (configRes.authDomain || `${projectId}.firebaseapp.com`)}`);
  console.log(`VITE_FIREBASE_PROJECT_ID=${configRes.projectId}`);
  console.log(`VITE_FIREBASE_STORAGE_BUCKET=${configRes.storageBucket || `${projectId}.appspot.com`}`);
  console.log(`VITE_FIREBASE_MESSAGING_SENDER_ID=${configRes.messagingSenderId}`);
  console.log(`VITE_FIREBASE_APP_ID=${configRes.appId}`);
}

main().catch(console.error);
