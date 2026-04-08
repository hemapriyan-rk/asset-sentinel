const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({});

// Listen for the `error` event on `proxy`.
proxy.on('error', function (err, req, res) {
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  res.end('Something went wrong. And we are reporting a custom error message.');
});

const server = http.createServer(function(req, res) {
  // Route /api requests to the backend (port 8001)
  if (req.url.startsWith('/api')) {
    proxy.web(req, res, { target: 'http://localhost:8001', changeOrigin: true });
  } 
  // Route everything else to the frontend (port 3000)
  else {
    proxy.web(req, res, { target: 'http://localhost:3000', changeOrigin: true });
  }
});

console.log("Unified Proxy listening on port 8080");
console.log("- Routing /api to http://localhost:8001");
console.log("- Routing /*    to http://localhost:3000");
console.log("\nRUN THIS COMMAND: cloudflared tunnel --url http://localhost:8080");

server.listen(8080);
