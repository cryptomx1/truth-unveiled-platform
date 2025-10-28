// Control Deck logic — live, production ready.
(function () {
  const ipnsKey = "k51qzi5uqu5dh45qt3n8yyw7dz9155l8ajajgzab1e3ehjuaw7lml8mkx4myhm";
  const baseIpns = `https://ipfs.io/ipns/${ipnsKey}`;
  const qs = new URLSearchParams(location.search);
  const invite = qs.get("invite") || "";

  // UI elements
  const ipnsLinkEl = document.getElementById("ipnsLink");
  const resolvedCidEl = document.getElementById("resolvedCid");
  const viewIpfsCidEl = document.getElementById("viewIpfsCid");
  const copyCidEl = document.getElementById("copyCid");
  const inviteDidEl = document.getElementById("inviteDid");
  const localIpnsLinkEl = document.getElementById("localIpnsLink");
  const logsPre = document.getElementById("logs");
  const refreshLogsBtn = document.getElementById("refreshLogs");
  const openLogsRaw = document.getElementById("openLogsRaw");
  const apiEndpointInput = document.getElementById("apiEndpoint");
  const fileInput = document.getElementById("fileInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadResult = document.getElementById("uploadResult");

  // Tabs
  const tabBtns = Array.from(document.querySelectorAll(".tabs button"));
  const tabs = {
    cid: document.getElementById("tab-cid"),
    node: document.getElementById("tab-node"),
    files: document.getElementById("tab-files"),
    logs: document.getElementById("tab-logs"),
  };
  tabBtns.forEach((b) => {
    b.addEventListener("click", () => {
      tabBtns.forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      Object.values(tabs).forEach(t => t.classList.add("hidden"));
      tabs[b.dataset.tab].classList.remove("hidden");
    });
  });

  // Header links
  ipnsLinkEl.href = baseIpns;
  ipnsLinkEl.textContent = `${baseIpns}`;
  localIpnsLinkEl.href = `http://127.0.0.1:8080/ipns/${ipnsKey}`;

  // Show invite DID (from QR/link)
  inviteDidEl.textContent = invite || "—";
  // DID binding
  const bindBtn = document.getElementById("bindDid");
  const bindStatus = document.getElementById("bindDidStatus");
  
  if (bindBtn) {
    bindBtn.addEventListener("click", async () => {
      bindStatus.textContent = "";
      if (!invite) {
        bindStatus.textContent = "No DID in URL (?invite=did:...)";
        return;
      }
      try {
        // Local-only binder API on the node machine
        const res = await fetch("http://127.0.0.1:7078/bind-did", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ did: invite })
        });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error || "Bind failed");
        bindStatus.textContent = "Bound + Published ✔ (refresh logs to see new CID)";
      } catch (e) {
        bindStatus.textContent = "Bind error: " + e.message;
      }
    });
  }

  // Resolve current CID by reading last line of published log via IPNS
  const logsUrl = `${baseIpns}/logs/ipfs_update.log`;
  openLogsRaw.href = logsUrl;

  async function fetchLogs() {
    try {
      const res = await fetch(logsUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      logsPre.textContent = text.trim().slice(-8000) || "(no logs yet)";
      // Try to extract the current CID from last non-empty line
      const lines = text.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1] || "";
      const m = last.match(/CID:\s*([a-z0-9]+)\s*\|/i) || last.match(/\/ipfs\/([a-z0-9]+)/i);
      if (m && m[1]) {
        const cid = m[1];
        resolvedCidEl.textContent = cid;
        viewIpfsCidEl.href = `https://ipfs.io/ipfs/${cid}`;
        copyCidEl.onclick = () => {
          navigator.clipboard.writeText(cid).then(() => {
            copyCidEl.textContent = "Copied!";
            setTimeout(() => (copyCidEl.textContent = "Copy"), 1200);
          });
        };
      } else {
        resolvedCidEl.textContent = "(not found in logs yet)";
        viewIpfsCidEl.removeAttribute("href");
      }
    } catch (e) {
      logsPre.textContent = `Failed to read logs: ${e.message}\n${logsUrl}`;
      resolvedCidEl.textContent = "(unavailable)";
    }
  }
  fetchLogs();
  refreshLogsBtn.addEventListener("click", fetchLogs);

  // Live upload to local IPFS HTTP API (honest path only)
  uploadBtn.addEventListener("click", async () => {
    uploadResult.textContent = "";
    const endpoint = (apiEndpointInput.value || "").trim();
    const file = fileInput.files && fileInput.files[0];

    if (!endpoint) {
      uploadResult.textContent = "Set your IPFS HTTP API endpoint first (e.g., http://127.0.0.1:5001/api/v0/add)";
      return;
    }
    if (!file) {
      uploadResult.textContent = "Choose a file to upload.";
      return;
    }

    try {
      const form = new FormData();
      form.append("file", file, file.name);

      const res = await fetch(endpoint, { method: "POST", body: form });
      const text = await res.text();

      // The IPFS HTTP API returns NDJSON or query-string style; display raw result.
      uploadResult.textContent = text;

      // Optional: if it includes a Hash field, show a gateway link
      const m = text.match(/"Hash"\s*:\s*"([^"]+)"/) || text.match(/cid["']?\s*[:=]\s*["']?([a-z0-9]+)/i);
      if (m && m[1]) {
        const cid = m[1];
        uploadResult.textContent += `\n\nView: https://ipfs.io/ipfs/${cid}`;
      }
    } catch (e) {
      uploadResult.textContent = `Upload failed: ${e.message}`;
    }
  });
})();