import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
if (fs.existsSync('.env')) {
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
} else {
  console.warn('Warning: .env file not found. Database connection may fail.');
}

const PORT = 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const distDir = path.join(__dirname, 'dist');
  const hasDist = fs.existsSync(distDir);

  // Serve static assets from dist if built, or direct guidance
  if (!pathname.startsWith('/api/')) {
    if (hasDist) {
      let filePath = path.join(distDir, pathname === '/' ? 'index.html' : pathname);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(distDir, 'index.html');
      }
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Erro ao carregar asset estático');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="utf-8"><title>Implatec API</title><style>body{font-family:sans-serif;padding:2rem;line-height:1.6;}</style></head>
        <body>
          <h2>Servidor Backend Local — Implatec Custos (Porta 3000)</h2>
          <p>As rotas da <code>/api</code> estão ativas e funcionando.</p>
          <p>Para abrir a interface em desenvolvimento com Vite, acesse: <a href="http://localhost:5173">http://localhost:5173</a></p>
          <p>Ou execute <code>npm run build</code> para gerar a pasta <code>dist</code> de produção.</p>
        </body>
        </html>
      `);
      return;
    }
  }

  // Serve API routes
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.substring(5);
    const apiFile = `${apiName}.js`;
    const apiPath = path.join(__dirname, 'api', apiFile);

    if (!fs.existsSync(apiPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
      return;
    }

    let bodyBuffer = [];
    req.on('data', chunk => {
      bodyBuffer.push(chunk);
    });

    req.on('end', async () => {
      const bodyStr = Buffer.concat(bodyBuffer).toString();

      // Parse query parameters
      const query = {};
      parsedUrl.searchParams.forEach((val, key) => {
        query[key] = val;
      });

      // Parse body if it is JSON
      let body = {};
      if (bodyStr) {
        try {
          body = JSON.parse(bodyStr);
        } catch (e) {
          // not JSON or invalid JSON
        }
      }

      // Populate Vercel-like request helpers
      req.query = query;
      req.body = body;

      // Populate Vercel-like response helpers
      res.status = function(code) {
        res.statusCode = code;
        return res;
      };

      res.json = function(data) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
        return res;
      };

      try {
        // Dynamically import the API module (which is native ESM)
        const moduleUrl = `file://${apiPath}?t=${Date.now()}`; // add timestamp to bypass ESM import cache for local dev
        const apiModule = await import(moduleUrl);
        const handler = apiModule.default;

        if (typeof handler === 'function') {
          await handler(req, res);
        } else {
          res.status(500).json({ error: 'Handler padrão não exportado no arquivo da API' });
        }
      } catch (err) {
        console.error(`Erro no endpoint ${pathname}:`, err);
        res.status(500).json({ error: err.message || 'Erro interno do servidor' });
      }
    });
    return;
  }

  // 404 for other assets (since it is a SPA and only index.html/APIs are used)
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Página não encontrada');
});

server.listen(PORT, () => {
  console.log(`Servidor rodando localmente em http://localhost:${PORT}`);
  console.log(`Pressione Ctrl+C para encerrar`);
});
