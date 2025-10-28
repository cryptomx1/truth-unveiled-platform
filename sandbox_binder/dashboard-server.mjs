import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT = 7070;
const telemetryFile = '/var/log/telemetry.log';
const refreshMs = 30000;

function getTelemetry() {
  try {
    const data = fs.readFileSync(telemetryFile, 'utf8').trim().split('\n').slice(-1)[0];
    const [ts, rest] = data.split(' load=');
    const [loadPart, memPart, gpuPart] = rest.split(' ');
    return {
      timestamp: ts,
      load: loadPart.split('=')[1],
      mem: memPart.split('=')[1],
      gpu: gpuPart.split('=')[1]
    };
  } catch (err) {
    return { error: err.message };
  }
}

function htmlPage(t) {
  return `
  <html>
  <head>
    <title>JasmyNetwork — Live Dashboard</title>
    <meta http-equiv="refresh" content="${refreshMs / 1000}">
    <style>
      body { font-family: Arial, sans-serif; background:#0a0a0a; color:#00ffcc; text-align:center; }
      .card { border:1px solid #00ffcc; border-radius:10px; margin:10px auto; padding:20px; width:70%; }
      h1 { color:#00ffff; }
      pre { text-align:left; margin:0 auto; width:fit-content; }
    </style>
  </head>
  <body>
    <h1>🧭 JasmyNetwork — Live Telemetry Dashboard</h1>
    <div class="card">
      <h2>Node Status</h2>
      <p><b>Hostname:</b> ${os.hostname()}</p>
      <p><b>Uptime:</b> ${(os.uptime()/3600).toFixed(2)} hours</p>
    </div>
    <div class="card">
      <h2>System Metrics</h2>
      <pre>${JSON.stringify(t, null, 2)}</pre>
    </div>
    <footer>Auto-refresh every ${(refreshMs/1000)}s</footer>
  </body>
  </html>`;
}

http.createServer((req, res) => {
  const telemetry = getTelemetry();
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(htmlPage(telemetry));
}).listen(PORT, () => console.log(`🧩 Dashboard live at http://localhost:${PORT}`));
