import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
function loadEnv() {
  if (!fs.existsSync('.env')) {
    console.warn('Warning: .env file not found. Database connection may fail.');
    return;
  }
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalsIdx = trimmed.indexOf('=');
    if (equalsIdx > 0) {
      const key = trimmed.substring(0, equalsIdx).trim();
      let value = trimmed.substring(equalsIdx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
  console.log('Environment variables loaded from .env');
}

loadEnv();

const REQUIRED_ENV = ['SQL_USER', 'SQL_PASSWORD', 'SQL_SERVER', 'SQL_DATABASE'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  console.error('The application may not function correctly without database credentials.');
}

const PORT = 3000;
const isDev = process.env.NODE_ENV !== 'production';

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJSON(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Serve static frontend
  if (pathname === '/' || pathname === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, content) => {
      if (err) {
        sendJSON(res, 500, { error: 'Erro ao carregar index.html' });
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      }
    });
    return;
  }

  // Serve API routes
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.substring(5);
    const apiFile = `${apiName}.js`;
    const apiPath = path.join(__dirname, 'api', apiFile);

    if (!fs.existsSync(apiPath)) {
      sendJSON(res, 404, { error: 'Endpoint não encontrado' });
      return;
    }

    let bodyBuffer = [];
    req.on('data', chunk => bodyBuffer.push(chunk));

    req.on('end', async () => {
      const bodyStr = Buffer.concat(bodyBuffer).toString();

      const query = {};
      parsedUrl.searchParams.forEach((val, key) => { query[key] = val; });

      let body = {};
      if (bodyStr) {
        try { body = JSON.parse(bodyStr); } catch {}
      }

      req.query = query;
      req.body = body;

      res.status = function(code) {
        res.statusCode = code;
        return res;
      };

      res.json = function(data) {
        sendJSON(res, res.statusCode, data);
        return res;
      };

      try {
        const moduleUrl = isDev
          ? `file://${apiPath}?t=${Date.now()}`
          : `file://${apiPath}`;
        const apiModule = await import(moduleUrl);
        const handler = apiModule.default;

        if (typeof handler === 'function') {
          await handler(req, res);
        } else {
          sendJSON(res, 500, { error: 'Handler padrão não exportado no arquivo da API' });
        }
      } catch (err) {
        console.error(`Erro no endpoint ${pathname}:`, err);
        sendJSON(res, 500, { error: err.message || 'Erro interno do servidor' });
      }
    });
    return;
  }

  // 404 for other assets
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Página não encontrada');
});

server.listen(PORT, () => {
  console.log(`Servidor rodando localmente em http://localhost:${PORT}`);
  console.log(`Ambiente: ${isDev ? 'desenvolvimento' : 'produção'}`);
  console.log(`Pressione Ctrl+C para encerrar`);
});
