const http = require('http');
const https = require('https');
const jwt = require('jsonwebtoken');

function postJson(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: hostname,
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(opts, (res) => {
      const setCookie = res.headers['set-cookie'];
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, setCookie, body: data }));
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const res = await postJson('localhost', '/api/auth/login', { email: 'admin@streamharbor.local', password: 'admin123' });
    console.log('login status', res.status);
    console.log('set-cookie header', res.setCookie);
    const setCookie = Array.isArray(res.setCookie) ? res.setCookie.join(';') : res.setCookie;
    const match = setCookie && setCookie.match(/auth-token=([^;]+)/);
    const token = match && match[1];
    const secret = process.env.NEXTAUTH_SECRET || 'your-super-secret-key-min-32-chars-long';
    console.log('token length', token ? token.length : null);
    const payload = jwt.verify(token, secret);
    console.log('payload', payload);

    // Now call /api/auth/me with the cookie header to confirm server route
    await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/me',
        method: 'GET',
        headers: {
          Cookie: `auth-token=${token}`,
        },
      };
      const req = http.request(opts, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          console.log('/api/auth/me status', res.statusCode);
          console.log('/api/auth/me body', body);
          resolve(null);
        });
      });
      req.on('error', reject);
      req.end();
    });
  } catch (err) {
    console.error('verify error', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
