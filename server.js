const http = require('http');
const https = require('https');

// ── ASAAS ──────────────────────────────────────────────
const ASAAS_PARTS = [
  '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJl',
  'NzZmNGZhZGY6OmMwNGRmYzllLTJjNzUtNDIyMC05OThmLTdiM2E2MjBiNzNiZTo6',
  'JGFhY2hfMTliMDhhMzQtNGYzMy00ZDM4LWI5ZGMtMGY2MTAxNjg0Njgy'
];
const ASAAS_KEY = ASAAS_PARTS.join('');

// ── EDUZZ ──────────────────────────────────────────────
const EDUZZ_TOKEN = 'edzpap_FOLamW4ldEeISR7-8CB8Ux7RRw-v43qFv_LACkn701CEFmNTHpqXu1ozJSWZajySHGgvAj_0fMQSLl5Pmyu';

const PORT = process.env.PORT || 3000;

function doRequest(apiUrl, headers, res) {
  https.get(apiUrl, { headers }, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      res.writeHead(apiRes.statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  }).on('error', (e) => {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: e.message }));
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const service = url.pathname.split('/')[2]; // /api/asaas ou /api/eduzz

  if (!service) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'FXGrowth Proxy Online', services: ['asaas', 'eduzz'] }));
    return;
  }

  // ── ASAAS ──
  if (service === 'asaas') {
    const path = url.searchParams.get('path');
    if (!path) { res.writeHead(400); res.end(JSON.stringify({ error: 'path required' })); return; }
    url.searchParams.delete('path');
    const qs = url.searchParams.toString();
    const apiUrl = 'https://api.asaas.com/v3' + path + (qs ? '?' + qs : '');
    doRequest(apiUrl, {
      'access_token': ASAAS_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'FXGrowth/1.0'
    }, res);
    return;
  }

  // ── EDUZZ ──
  if (service === 'eduzz') {
    const path = url.searchParams.get('path');
    if (!path) { res.writeHead(400); res.end(JSON.stringify({ error: 'path required' })); return; }
    url.searchParams.delete('path');
    const qs = url.searchParams.toString();
    const apiUrl = 'https://api.eduzz.com' + path + (qs ? '?' + qs : '');
    doRequest(apiUrl, {
      'authorization': 'Bearer ' + EDUZZ_TOKEN,
      'accept': 'application/json',
      'User-Agent': 'FXGrowth/1.0'
    }, res);
    return;
  }

  res.writeHead(404); res.end(JSON.stringify({ error: 'Service not found' }));
});

server.listen(PORT, () => console.log(`FXGrowth Proxy rodando na porta ${PORT}`));
