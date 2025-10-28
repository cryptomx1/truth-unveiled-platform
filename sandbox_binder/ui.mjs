import express from "express";
import os from "os";
import { execSync } from "child_process";

const app = express();
const PORT = 7070;

function safeExec(cmd) {
  try {
    return execSync(cmd).toString().trim();
  } catch (e) {
    return "N/A";
  }
}

app.get("/", (req, res) => {
  const uptime = safeExec("uptime");
  const hostname = os.hostname();
  const load = os.loadavg().map(n => n.toFixed(2)).join(", ");
  const mem = safeExec("free -h");
  const peers = safeExec("ipfs swarm peers | wc -l || echo 0");

  // GPU metrics via nvidia-smi
  const gpuInfo = safeExec(
    "nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits"
  )
    .split("\n")
    .filter(line => line)
    .map(line => {
      const [name, temp, util, memUsed, memTotal] = line.split(", ");
      return { name, temp, util, memUsed, memTotal };
    });

  // CPU metrics
  const cpuUsage = safeExec("top -bn1 | grep 'Cpu(s)'");
  const processes = safeExec("ps -eo pid,comm,%mem,%cpu --sort=-%cpu | head -n 10");

  res.send(`
    <html>
    <head>
      <title>JasmyNetwork Telemetry</title>
      <meta http-equiv="refresh" content="10" />
      <style>
        body { font-family: monospace; background: #0a0a0a; color: #00ffcc; padding: 20px; }
        h1 { color: #00ffff; }
        pre { background: #111; padding: 10px; border-radius: 8px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #00ffcc; padding: 6px; text-align: left; }
      </style>
    </head>
    <body>
      <h1>🧭 JasmyNetwork — Real-Time Telemetry Dashboard</h1>
      <pre>
Hostname: ${hostname}
Load Avg: ${load}
IPFS Peers: ${peers}
Uptime: ${uptime}
      </pre>

      <h2>🧠 CPU Summary</h2>
      <pre>${cpuUsage}</pre>

      <h2>⚙️ Top Processes</h2>
      <pre>${processes}</pre>

      <h2>🎮 GPU Status</h2>
      <table>
        <tr><th>GPU</th><th>Temp (°C)</th><th>Util (%)</th><th>Mem Used (MiB)</th><th>Mem Total (MiB)</th></tr>
        ${gpuInfo
          .map(
            g => `<tr>
              <td>${g.name}</td>
              <td>${g.temp}</td>
              <td>${g.util}</td>
              <td>${g.memUsed}</td>
              <td>${g.memTotal}</td>
            </tr>`
          )
          .join("")}
      </table>

      <h2>💾 Memory Overview</h2>
      <pre>${mem}</pre>

      <p style="margin-top:20px; color:#555;">Auto-refreshes every 10 seconds.</p>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Telemetry Dashboard running on http://localhost:${PORT}`);
});
