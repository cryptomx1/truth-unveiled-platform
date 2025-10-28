const seedBtn = document.getElementById("generate-seed");
const seedDisplay = document.getElementById("seed-display");
const authBtn = document.getElementById("create-auth");
const bindBtn = document.getElementById("bind-did");
const resultBox = document.getElementById("result-box");

// Base binder URL
const BINDER_URL = "http://127.0.0.1:7078";

// 🔹 Generate 12-word seed
seedBtn.addEventListener("click", async () => {
  seedDisplay.textContent = "Generating...";
  try {
    const res = await fetch(`${BINDER_URL}/seed/new`);
    const data = await res.json();
    seedDisplay.textContent = data.seed;
  } catch (err) {
    seedDisplay.textContent = "Error: " + err.message;
  }
});

// 🔹 Create Auth Secret (TOTP setup)
authBtn.addEventListener("click", () => {
  resultBox.textContent = "🔐 Authenticator setup coming soon (TOTP QR).";
});

// 🔹 Bind DID
bindBtn.addEventListener("click", async () => {
  const label = prompt("Enter your name or alias for DID registration:");
  if (!label) return;

  try {
    const res = await fetch(`${BINDER_URL}/did/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label })
    });
    const data = await res.json();
    resultBox.textContent = `✅ DID Created: ${data.did}`;
  } catch (err) {
    resultBox.textContent = "❌ Error: " + err.message;
  }
});
