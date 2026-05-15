const http = require('http');
const handler = require('./api/asaas');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  req.query = Object.fromEntries(url.searchParams);
  handler(req, res);
});

server.listen(PORT, () => {
  console.log(`Proxy rodando na porta ${PORT}`);
});
