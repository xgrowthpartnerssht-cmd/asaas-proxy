const http = require('http');
const https = require('https');

const ASAAS_KEY = [
  '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJl',
  'NzZmNGZhZGY6OmMwNGRmYzllLTJjNzUtNDIyMC05OThmLTdiM2E2MjBiNzNiZTo6',
  'JGFhY2hfMTliMDhhMzQtNGYzMy00ZDM4LWI5ZGMtMGY2MTAxNjg0Njgy'
].join('');

// Token da nova API OAuth da Eduzz (api.eduzz.com)
const EDUZZ_TOKEN = 'edzpap_FOLamW4ldEeISR7-8CB8Ux7RRw-v43qFv_LACkn701CEFmNTHpqXu1ozJSWZajySHGgvAj_0fMQSLl5Pmyu';

const PORT = process.env.PORT || 3000;

function doGet(apiUrl, headers) {
  return new Promise((resolve, reject) => {
    https.get(apiUrl, { headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean);
  const service = parts[1];

  // Health check
  if (!service) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'FXGrowth Proxy Online' }));
    return;
  }

  // ── ASAAS (GET) ──
  if (service === 'asaas') {
    const path = url.searchParams.get('path');
    if (!path) { res.writeHead(400); res.end(JSON.stringify({ error: 'path required' })); return; }
    url.searchParams.delete('path');
    const qs = url.searchParams.toString();
    const apiUrl = 'https://api.asaas.com/v3' + path + (qs ? '?' + qs : '');
    try {
      const r = await doGet(apiUrl, {
        'access_token': ASAAS_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'FXGrowth/1.0'
      });
      res.writeHead(r.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(r.body);
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── EDUZZ (GET com Bearer token) ──
  // ✅ API correta: api.eduzz.com (nova API OAuth)
  // ✅ Método: GET com Authorization: bearer <token>
  // ✅ Endpoints: /myeduzz/v1/invoices, /accounts/v1/me, etc.
  if (service === 'eduzz') {
    const eduzzHeaders = {
      'authorization': 'bearer ' + EDUZZ_TOKEN,
      'accept': 'application/json',
      'content-type': 'application/json'
    };

    // Extrai path e query string
    // Formato URL:  GET /api/eduzz/myeduzz/v1/invoices?page=1
    // Formato QS:   GET /api/eduzz?path=/myeduzz/v1/invoices&page=1
    let eduzzPath = '';
    let qs = '';

    if (parts.length > 2) {
      eduzzPath = '/' + parts.slice(2).join('/');
      qs = url.searchParams.toString();
    } else {
      eduzzPath = url.searchParams.get('path') || '';
      url.searchParams.delete('path');
      qs = url.searchParams.toString();
    }

    if (!eduzzPath) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Eduzz path required' }));
      return;
    }

    // ✅ CORREÇÃO FINAL: api.eduzz.com (não api2!) + GET + bearer token
    const apiUrl = 'https://api.eduzz.com' + eduzzPath + (qs ? '?' + qs : '');
    console.log('[EDUZZ] GET:', apiUrl);

    try {
      const r = await doGet(apiUrl, eduzzHeaders);
      console.log('[EDUZZ] Status:', r.status, '| Preview:', r.body.substring(0, 300));
      res.writeHead(r.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(r.body);
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Service not found' }));
});

server.listen(PORT, () => console.log('FXGrowth Proxy rodando na porta ' + PORT));
