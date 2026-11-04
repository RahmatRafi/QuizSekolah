/**
 * PintarKuiz & Ruang TKA - Local Server
 * Node.js 24 Standard Library (Zero External Dependencies)
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Secure Server-Side Config (optional .env or server-config.json)
const CONFIG_FILE = path.join(DATA_DIR, 'server-config.json');
function getServerApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (cfg.geminiApiKey) return cfg.geminiApiKey.trim();
    } catch (e) {}
  }
  return '';
}

// Ensure data folder and history file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([]), 'utf8');
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper to read JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // ==========================================
  // API ROUTING
  // ==========================================
  if (pathname === '/api/health') {
    return sendJSON(res, 200, { status: 'ok', server: 'PintarKuiz Node Server', timestamp: Date.now() });
  }

  // Question Generator Endpoint (Server-Side Proxy & Generator)
  if (pathname === '/api/generate-questions' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const serverKey = getServerApiKey();
      const effectiveKey = body.apiKey || serverKey;

      const { AIGenerator } = require('./public/js/ai-generator.js');
      // If server key is present, temporarily provide it to AIGenerator
      if (serverKey && !body.apiKey) {
        AIGenerator.getApiKey = () => serverKey;
      }

      const questions = await AIGenerator.generateQuestions({
        level: body.level || 'SD',
        grade: body.grade ? parseInt(body.grade, 10) : null,
        subjectId: body.subjectId || 'sd_matematika',
        count: parseInt(body.count, 10) || 30
      });
      return sendJSON(res, 200, { success: true, questions });
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // Server-side secure config endpoint
  if (pathname === '/api/config') {
    if (req.method === 'GET') {
      const hasKey = Boolean(getServerApiKey());
      return sendJSON(res, 200, { hasServerKey: hasKey });
    }
    if (req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        if (body.geminiApiKey !== undefined) {
          fs.writeFileSync(CONFIG_FILE, JSON.stringify({ geminiApiKey: body.geminiApiKey.trim() }, null, 2), 'utf8');
        }
        return sendJSON(res, 200, { success: true, hasServerKey: Boolean(body.geminiApiKey) });
      } catch (e) {
        return sendJSON(res, 500, { error: e.message });
      }
    }
  }

  // History GET / POST / DELETE
  if (pathname === '/api/history') {
    if (req.method === 'GET') {
      try {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
        return sendJSON(res, 200, JSON.parse(raw));
      } catch (err) {
        return sendJSON(res, 500, { error: 'Failed to read history' });
      }
    }

    if (req.method === 'POST') {
      try {
        const newEntry = await parseRequestBody(req);
        let list = [];
        try {
          list = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        } catch (e) {}
        list.unshift(newEntry);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(list, null, 2), 'utf8');
        return sendJSON(res, 201, { success: true, count: list.length });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (req.method === 'DELETE') {
      try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify([]), 'utf8');
        return sendJSON(res, 200, { success: true });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }
  }

  // Delete specific history item by ID
  if (pathname.startsWith('/api/history/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/history/', '');
    try {
      let list = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      list = list.filter(item => item.id !== id);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(list, null, 2), 'utf8');
      return sendJSON(res, 200, { success: true, remaining: list.length });
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ==========================================
  // STATIC FILES SERVING
  // ==========================================
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Access denied');
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA if not an asset
      if (!path.extname(pathname)) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Error reading file');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log(`\n======================================================`);
  console.log(`  🎓 PintarKuiz & Ruang TKA Server Berjalan!`);
  console.log(`  💻 Di Laptop / Komputer ini : http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`  📱 Di HP Android (1 Wi-Fi)  : http://${ips[0]}:${PORT}`);
  }
  console.log(`======================================================\n`);
});
