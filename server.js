const http = require('http');
const https = require('https');

const ASAAS_KEY = [
  '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJl',
  'NzZmNGZhZGY6OmMwNGRmYzllLTJjNzUtNDIyMC05OThmLTdiM2E2MjBiNzNiZTo6',
  'JGFhY2hfMTliMDhhMzQtNGYzMy00ZDM4LWI5ZGMtMGY2MTAxNjg0Njgy'
].join('');

const EDUZZ_TOKEN = 'edzpap_FOLamW4ldEeISR7-8CB8Ux7RRw-v43qFv_LACkn701CEFmNTHpqXu1ozJSWZajySHGgvAj_0fMQSLl5Pmyu';
const FB_TOKEN   = 'EAAjOpur6WqABRgCIxp3LYurC4hmMLcFjOqBtk4JD4CN0hhu2CwTBmBoItmRrQC0mnTHxEZBuVDNmknfyOQXecPHoycgh6O7nkeojyklBRh5lP5ZB5PmoZALRb5ealzxyZCUOnKEJXTfNuK6OVBH3rhReq6W195ykWjs2EvHz2AHAeL9CTGZBSjAlje5OOpxTlIG';
const FB_ACCOUNT = 'act_1964754258257133';
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

  if (!service) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'FXGrowth Proxy Online' }));
    return;
  }

  // ── ASAAS ──
  if (service === 'asaas') {
    const path = url.searchParams.get('path');
    if (!path) { res.writeHead(400); res.end(JSON.stringify({ error: 'path required' })); return; }
    url.searchParams.delete('path');
    const qs = url.searchParams.toString();
    const apiUrl = 'https://api.asaas.com/v3' + path + (qs ? '?' + qs : '');
    try {
      const r = await doGet(apiUrl, { 'access_token': ASAAS_KEY, 'Content-Type': 'application/json', 'User-Agent': 'FXGrowth/1.0' });
      res.writeHead(r.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(r.body);
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── EDUZZ ──
  if (service === 'eduzz') {
    let eduzzPath = '', qs = '';
    if (parts.length > 2) {
      eduzzPath = '/' + parts.slice(2).join('/');
      qs = url.searchParams.toString();
    } else {
      eduzzPath = url.searchParams.get('path') || '';
      url.searchParams.delete('path');
      qs = url.searchParams.toString();
    }
    if (!eduzzPath) { res.writeHead(400); res.end(JSON.stringify({ error: 'Eduzz path required' })); return; }
    const apiUrl = 'https://api.eduzz.com' + eduzzPath + (qs ? '?' + qs : '');
    console.log('[EDUZZ] GET:', apiUrl);
    try {
      const r = await doGet(apiUrl, { 'authorization': 'bearer ' + EDUZZ_TOKEN, 'accept': 'application/json' });
      console.log('[EDUZZ] Status:', r.status, '| Preview:', r.body.substring(0, 200));
      res.writeHead(r.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(r.body);
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── FACEBOOK ADS ──
  if (service === 'facebook') {
    const action = parts[2] || 'insights';

    // ✅ Inclui action_values para purchase value e cost_per_action_type para CPL real
    const fields = [
      'campaign_name',
      'spend','impressions','reach','frequency',
      'clicks','cpc','cpm','ctr','landing_page_views',
      'actions','action_values','cost_per_action_type',
      'date_start','date_stop'
    ].join(',');

    const datePreset = url.searchParams.get('date_preset') || 'this_month';
    const since      = url.searchParams.get('since') || '';
    const until      = url.searchParams.get('until') || '';

    let timeRange = '';
    if (since && until) {
      timeRange = `&time_range={"since":"${since}","until":"${until}"}`;
    } else {
      timeRange = `&date_preset=${datePreset}`;
    }

    // ✅ Janela de atribuição padrão: 7 dias após clique (igual ao Ads Manager)
    const attribution = '&action_attribution_windows=["7d_click","1d_view"]';

    let apiUrl = '';
    if (action === 'campaigns') {
      apiUrl = `https://graph.facebook.com/v21.0/${FB_ACCOUNT}/insights?fields=${fields}&level=campaign${timeRange}${attribution}&limit=50&access_token=${FB_TOKEN}`;
    } else {
      apiUrl = `https://graph.facebook.com/v21.0/${FB_ACCOUNT}/insights?fields=${fields}${timeRange}${attribution}&limit=1&access_token=${FB_TOKEN}`;
    }

    console.log('[FACEBOOK] GET:', apiUrl.replace(FB_TOKEN, 'TOKEN_HIDDEN'));
    try {
      const r = await doGet(apiUrl, { 'User-Agent': 'FXGrowth/1.0' });
      console.log('[FACEBOOK] Status:', r.status, '| Preview:', r.body.substring(0, 300));
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
