const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const port = Number(process.env.PORT || 3000);
const publicDir = process.env.PUBLIC_DIR ? path.resolve(process.cwd(), process.env.PUBLIC_DIR) : '';
const links = new Map();

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function createCode() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', chunk => {
      chunks.push(Buffer.from(chunk));
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', reject);
  });
}

function sendPublicFile(req, res, requestPath) {
  if (!publicDir || req.method !== 'GET') {
    return false;
  }

  const relativePath = requestPath === '/' ? 'index.html' : decodeURIComponent(requestPath.slice(1));
  const filePath = path.resolve(publicDir, relativePath);

  if (!filePath.startsWith(publicDir + path.sep) && filePath !== publicDir) {
    sendJson(res, 404, { error: 'Not found.' });
    return true;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': contentTypes[ext] || 'application/octet-stream'
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${port}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/links') {
    try {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body || '{}');
      const originalUrl = payload.url || '';

      if (!/^https?:\/\//i.test(originalUrl)) {
        sendJson(res, 400, { error: 'A valid http(s) URL is required.' });
        return;
      }

      let code = createCode();
      while (links.has(code)) {
        code = createCode();
      }

      const link = {
        code,
        url: originalUrl,
        shortUrl: `http://localhost:${port}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString()
      };

      links.set(code, link);
      sendJson(res, 201, link);
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body.' });
    }
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/links') {
    sendJson(res, 200, Array.from(links.values()));
    return;
  }

  if ((requestUrl.pathname === '/' || path.extname(requestUrl.pathname)) && sendPublicFile(req, res, requestUrl.pathname)) {
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname !== '/favicon.ico') {
    const code = requestUrl.pathname.slice(1);
    const link = links.get(code);

    if (!link) {
      sendJson(res, 404, { error: 'Link not found.' });
      return;
    }

    link.hits += 1;
    res.writeHead(302, {
      Location: link.url,
      'Access-Control-Allow-Origin': '*'
    });
    res.end();
    return;
  }

  sendJson(res, 404, { error: 'Not found.' });
});

server.listen(port, () => {
  console.log(`Snip backend listening on http://localhost:${port}`);
});
