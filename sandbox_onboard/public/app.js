(function(){
  const qs = new URLSearchParams(location.search);
  const SANDBOX_IPNS = "k2k4r8phaa8e8sfdjaiomfgm8rwg62thoae59yt5u788jlujqkziq1dq"; // set to the actual sandbox IPNS key

  // Elements
  const genSeedBtn = document.getElementById("genSeed");
  const seedInput  = document.getElementById("seed");
  const initTotpBtn = document.getElementById("initTotp");
  const qrImg = document.getElementById("qr");
  const verifyTotpBtn = document.getElementById("verifyTotp");
  const totpInput = document.getElementById("totp");
  const totpStatus = document.getElementById("totpStatus");
  const didInput = document.getElementById("did");
  const bindBtn = document.getElementById("bind");
  const bindStatus = document.getElementById("bindStatus");
  const sandboxIpnsA = document.getElementById("sandboxIpns");

  // Set sandbox IPNS link
  sandboxIpnsA.textContent = `https://ipfs.io/ipns/${SANDBOX_IPNS}`;
  sandboxIpnsA.href = `https://ipfs.io/ipns/${SANDBOX_IPNS}`;

  genSeedBtn.addEventListener("click", async ()=>{
    const j = await fetch("http://127.0.0.1:7078/seed/new").then(r=>r.json());
    if (j.ok) seedInput.value = j.seed;
  });

  initTotpBtn.addEventListener("click", async ()=>{
    const j = await fetch("http://127.0.0.1:7081/totp/init", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ label: "Mark" })}).then(r=>r.json());
    if (j.ok) { qrImg.src = j.qr; qrImg.style.display = "block"; totpStatus.textContent = "Scan the QR and enter the 6-digit code."; }
  });

  verifyTotpBtn.addEventListener("click", async ()=>{
    const code = (totpInput.value||"").trim();
    const j = await fetch("http://127.0.0.1:7081/totp/verify", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ token: code })}).then(r=>r.json());
    totpStatus.textContent = j.ok ? "TOTP verified ✔" : "Invalid code";
  });

  bindBtn.addEventListener("click", async ()=>{
    bindStatus.textContent = "";
    const did = (didInput.value || "").trim();
    const seed = (seedInput.value || "").trim();
    if (!did.startsWith("did:truth:")) { bindStatus.textContent = "Enter a valid DID (did:truth:...)"; return; }
    if (!seed || seed.split(" ").length < 12) { bindStatus.textContent = "Seed required (12 words)"; return; }

    try {
      const j = await fetch("http://127.0.0.1:7078/bind-did", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ did, encrypt: true, passphrase: seed })
      }).then(r=>r.json());
      if (!j.ok) throw new Error(j.error || "Bind failed");
      bindStatus.textContent = "Bound + Encrypted + Published ✔  (Open Sandbox IPNS above)";
    } catch(e) {
      bindStatus.textContent = "Bind error: " + e.message;
    }
  });
})();