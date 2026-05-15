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

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean); // ['api', 'eduzz', 'sale', 'get_list']
  const service = parts[1]; // 'asaas' ou 'eduzz'

  if (!service) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'FXGrowth Proxy Online', services: ['asaas', 'eduzz'] }));
    return;
  }

  // ── ASAAS ──────────────────────────────────────────────
  if (service === 'asaas') {
    const path = url.searchParams.get('path');
    if (!path) { res.writeHead(400); res.end(JSON.stringify({ error: 'path required' })); return; }
    url.searchParams.delete('path');
    const qs = url.searchParams.toString();
    const apiUrl = 'https://api.asaas.com/v3' + path + (qs ? '?' + qs : '');
    try {
      const r = await doGet(apiUrl, { 'access_token': ASAAS_KEY, 'Content-Type': 'application/json' });
      res.writeHead(r.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(r.body);
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── EDUZZ ──────────────────────────────────────────────
  if (service === 'eduzz') {
    const eduzzHeaders = {
      'authorization': 'Bearer ' + EDUZZ_TOKEN,
      'accept': 'application/json',
      'content-type': 'application/json'
    };

    // Suporta DOIS formatos:
    // Formato 1 (path na URL): /api/eduzz/sale/get_list?page=1
    // Formato 2 (path como QS): /api/eduzz?path=/sale/get_list&page=1

    let eduzzPath = '';
    let qs = '';

    if (parts.length > 2) {
      // Formato 1: path está na URL após /api/eduzz/
      eduzzPath = '/' + parts.slice(2).join('/');
      qs = url.searchParams.toString();
    } else {
      // Formato 2: path está no query param
      eduzzPath = url.searchParams.get('path') || '';
      url.searchParams.delete('path');
      qs = url.searchParams.toString();
    }

    if (!eduzzPath) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Eduzz path required' }));
      return;
    }

    const apiUrl = 'https://api2.eduzz.com' + eduzzPath + (qs ? '?' + qs : '');
    console.log('[EDUZZ] Chamando:', apiUrl);

    try {
      const r = await doGet(apiUrl, eduzzHeaders);
      console.log('[EDUZZ] Status:', r.status, '| Preview:', r.body.substring(0, 200));
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
