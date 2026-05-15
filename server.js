const http = require('http');
const https = require('https');

const ASAAS_KEY = [
  '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJl',
  'NzZmNGZhZGY6OmMwNGRmYzllLTJjNzUtNDIyMC05OThmLTdiM2E2MjBiNzNiZTo6',
  'JGFhY2hfMTliMDhhMzQtNGYzMy00ZDM4LWI5ZGMtMGY2MTAxNjg0Njgy'
].join('');

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

// ✅ NOVO: POST para Eduzz API v2
function doPost(apiUrl, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const urlObj = new URL(apiUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  // ── EDUZZ (POST) ──
  // ✅ api2.eduzz.com + método POST (exigido pela API v2)
  if (service === 'eduzz') {
    const eduzzHeaders = {
      'authorization': 'Bearer ' + EDUZZ_TOKEN,
      'accept': 'application/json',
      'content-type': 'application/json'
    };

    // Extrai o path da Eduzz:
    // Formato URL:  /api/eduzz/sale/get_list
    // Formato QS:   /api/eduzz?path=/sale/get_list
    let eduzzPath = '';
    let queryParams = {};

    if (parts.length > 2) {
      eduzzPath = '/' + parts.slice(2).join('/');
      url.searchParams.forEach((v, k) => { queryParams[k] = v; });
    } else {
      eduzzPath = url.searchParams.get('path') || '';
      url.searchParams.delete('path');
      url.searchParams.forEach((v, k) => { queryParams[k] = v; });
    }

    if (!eduzzPath) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Eduzz path required' }));
      return;
    }

    const apiUrl = 'https://api2.eduzz.com' + eduzzPath;
    console.log('[EDUZZ] POST:', apiUrl, '| Params:', JSON.stringify(queryParams));

    try {
      // Eduzz API v2 usa POST com body JSON
      const r = await doPost(apiUrl, eduzzHeaders, queryParams);
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
