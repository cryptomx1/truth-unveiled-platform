#!/usr/bin/env bash
set -euo pipefail

PHASE="XXXI-InsightWeave"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ROOT="${HOME}/projects/truth-unveiled"
LOGDIR="${ROOT}/logs"
DATADIR="${ROOT}/data"
CFGDIR="${ROOT}/core/config"
DASHDIR="${ROOT}/settlements/dashboard"
CVL="${LOGDIR}/continuum_verification_ledger.jsonl"

STREAM="${LOGDIR}/global_telemetry_grid.jsonl"
HEALTH="${LOGDIR}/federation_health.json"
TRUST="${LOGDIR}/trust_graph.json"
ANOMS="${LOGDIR}/anomaly_events.jsonl"
CONSENSUS_LOG="${LOGDIR}/consensus_results.jsonl"
POLICY="${CFGDIR}/policy_gate.json"
CODEX_IDX="${ROOT}/memory/codex_index.jsonl"

OUT_JSON="${LOGDIR}/insight_weave.json"
OUT_OVLY="${DASHDIR}/insights.json"

mkdir -p "${LOGDIR}" "${DASHDIR}"
command -v jq >/dev/null || { echo "[${PHASE}] jq required"; exit 1; }

INSIGHT_SCRIPT="$(mktemp)"
cat > "${INSIGHT_SCRIPT}" <<'PY'
import json, os, time, hashlib
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT = Path.home() / "projects" / "truth-unveiled"
LOG = ROOT / "logs"
CFG = ROOT / "core" / "config"
DASH = ROOT / "settlements" / "dashboard"

files = {
  "telemetry": LOG / "global_telemetry_grid.jsonl",
  "health": LOG / "federation_health.json",
  "trust": LOG / "trust_graph.json",
  "anoms": LOG / "anomaly_events.jsonl",
  "consensus": LOG / "consensus_results.jsonl",
  "policy": CFG / "policy_gate.json",
  "codex": ROOT / "memory" / "codex_index.jsonl",
}

def utcnow(): return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
def load_json(path, default=None):
    try:
        with open(path) as f: return json.load(f)
    except: return default

def load_jsonl(path):
    out=[]
    if not Path(path).exists(): return out
    with open(path) as f:
        for line in f:
            line=line.strip()
            if not line: continue
            try: out.append(json.loads(line))
            except: pass
    return out

# --- Load sources
telemetry = load_jsonl(files["telemetry"])
health = load_json(files["health"], {})
trust = load_json(files["trust"], {})
anoms = load_jsonl(files["anoms"])
consensus_hist = load_jsonl(files["consensus"])
policy = load_json(files["policy"], {})
codex_idx = load_jsonl(files["codex"])

# --- Compute windows
now = datetime.now(timezone.utc)
t_1h = now - timedelta(hours=1)
t_24h = now - timedelta(hours=24)

# --- Helper: last values per node from telemetry
last_by_node = {}
for rec in telemetry[-2000:]:
    node = rec.get("node") or rec.get("id") or "unknown"
    last_by_node[node] = rec

# --- KPI rollups
def safe(v,d=0): 
    try: return float(v)
    except: return d

nodes = list(set(list(last_by_node.keys()) + list(health.keys())))
kpis=[]
for n in nodes:
    h = health.get(n, {})
    r = last_by_node.get(n, {})
    uptime = h.get("uptime_pct", r.get("uptime_pct", 0))
    lat = h.get("latency_ms", r.get("avg_latency_ms", r.get("latency", 0)))
    tw = trust.get(n, {}).get("trust_score", trust.get(n.replace("did:j:",""), {}).get("trust_score", 0))
    kpis.append({"node":n,"uptime_pct":safe(uptime), "latency_ms":safe(lat), "trust_weight":safe(tw)})

avg_uptime = round(sum(x["uptime_pct"] for x in kpis)/max(len(kpis),1),2) if kpis else 0.0
avg_latency = round(sum(x["latency_ms"] for x in kpis)/max(len(kpis),1),2) if kpis else 0.0
avg_trust = round(sum(x["trust_weight"] for x in kpis)/max(len(kpis),1),3) if kpis else 0.0

# --- Outliers (simple robust z-ish heuristic)
import statistics as st
lat_vals=[x["latency_ms"] for x in kpis if x["latency_ms"]>0]
up_vals=[x["uptime_pct"] for x in kpis if x["uptime_pct"]>=0]
tw_vals=[x["trust_weight"] for x in kpis if x["trust_weight"]>0]

def top_outliers(items, key, high=True, k=3):
    vals=[i[key] for i in items if key in i]
    if len(vals)<2: return []
    m=st.mean(vals); s=max(st.pstdev(vals), 1e-6)
    scored=[(abs((i[key]-m)/s), i) for i in items]
    scored.sort(key=lambda x: x[0], reverse=True)
    out=[i for z,i in scored if (i[key]>m if high else i[key]<m)]
    return out[:k]

latency_hot = top_outliers(kpis, "latency_ms", high=True, k=3)
uptime_low  = top_outliers(kpis, "uptime_pct", high=False, k=3)
trust_top   = sorted(kpis, key=lambda x: x["trust_weight"], reverse=True)[:3]

# --- Recent anomalies (last 24h)
recent_anoms=[a for a in anoms if a.get("timestamp") and \
    (datetime.fromisoformat(a["timestamp"].replace("Z","+00:00"))>=t_24h)]

# --- Policy impact (latest consensus vs policy)
latest_consensus = consensus_hist[-1] if consensus_hist else {}
policy_state = {
  "public_node_registration": policy.get("public_node_registration"),
  "last_decision": policy.get("last_decision"),
  "last_change_ts": policy.get("last_change_ts")
}

# --- Correlation sketch (uptime vs latency; trust vs latency)
def corr_xy(items, xk, yk):
    xs=[safe(i.get(xk)) for i in items if xk in i and yk in i]
    ys=[safe(i.get(yk)) for i in items if xk in i and yk in i]
    if len(xs)<2: return None
    mx=sum(xs)/len(xs); my=sum(ys)/len(ys)
    num=sum((x-mx)*(y-my) for x,y in zip(xs,ys))
    den=(sum((x-mx)**2 for x in xs)*sum((y-my)**2 for y in ys))**0.5 or 1e-9
    return round(num/den,3)

corr_uptime_latency = corr_xy(kpis, "uptime_pct", "latency_ms")
corr_trust_latency  = corr_xy(kpis, "trust_weight", "latency_ms")

# --- Draft insights
insights = []
insights.append({"type":"kpi", "title":"Federation Health KPIs",
  "avg_uptime_pct":avg_uptime,"avg_latency_ms":avg_latency,"avg_trust_weight":avg_trust})
if latency_hot: insights.append({"type":"outlier","title":"High latency nodes","nodes":latency_hot})
if uptime_low:  insights.append({"type":"outlier","title":"Low uptime nodes","nodes":uptime_low})
if trust_top:   insights.append({"type":"ranking","title":"Top trust-weighted nodes","nodes":trust_top})
insights.append({"type":"correlation","title":"Uptime vs Latency","pearson_r":corr_uptime_latency})
insights.append({"type":"correlation","title":"Trust vs Latency","pearson_r":corr_trust_latency})
insights.append({"type":"events","title":"Anomalies (24h)","count":len(recent_anoms)})
insights.append({"type":"governance","title":"Policy State","policy":policy_state,"latest_consensus":latest_consensus})

# --- Build report
report = {
  "timestamp": utcnow(),
  "phase": "XXXI-InsightWeave",
  "summary": {
    "nodes": len(kpis),
    "avg_uptime_pct": avg_uptime,
    "avg_latency_ms": avg_latency,
    "avg_trust_weight": avg_trust,
    "anomalies_last_24h": len(recent_anoms)
  },
  "insights": insights,
  "sources": {k:str(v) for k,v in files.items()}
}

# Write outputs
(LOG / "insight_weave.json").write_text(json.dumps(report, indent=2))
(DASH / "insights.json").write_text(json.dumps({"timestamp":utcnow(),"insights":insights}, indent=2))

# Proof
h = hashlib.sha256(json.dumps(report, sort_keys=True).encode()).hexdigest()
print(json.dumps({"proof_sha256":h,"nodes":len(kpis),"avg_uptime_pct":avg_uptime,"avg_latency_ms":avg_latency,"avg_trust_weight":avg_trust}))
PY

# --- Run compute
RESULT_JSON="$(python3 "${INSIGHT_SCRIPT}")"
PROOF_SHA="$(jq -r '.proof_sha256' <<< "${RESULT_JSON}")"

# --- Optional IPFS pin
CID_INSIGHTS=""
if command -v ipfs >/dev/null 2>&1; then
  CID_INSIGHTS="$(ipfs add -q --pin "${OUT_JSON}" || true)"
fi

# --- Append to CVL
if [ -f "${CVL}" ]; then
  jq -nc --arg ts "${TS}" --arg phase "${PHASE}" \
         --arg proof "${PROOF_SHA}" --arg cid "${CID_INSIGHTS}" \
         '{timestamp:$ts, phase:$phase, proof_sha256:$proof, cids:{insights:$cid}, status:"compiled"}' >> "${CVL}"
fi

echo "=== Phase XXXI — Insight Weave Report ==="
echo "Phase: ${PHASE} @ ${TS}"
echo "Nodes analyzed: $(jq -r '.nodes' <<< "${RESULT_JSON}")"
echo "Avg Uptime: $(jq -r '.avg_uptime_pct' <<< "${RESULT_JSON}")% | Avg Latency: $(jq -r '.avg_latency_ms' <<< "${RESULT_JSON}") ms | Avg Trust: $(jq -r '.avg_trust_weight' <<< "${RESULT_JSON}")"
echo "Proof (SHA-256): ${PROOF_SHA}"
[ -n "${CID_INSIGHTS}" ] && echo "IPFS (insight_weave.json): ${CID_INSIGHTS}"
echo "Insight file: ${OUT_JSON}"
echo "Dashboard overlay: ${OUT_OVLY}"
[ -f "${CVL}" ] && echo "CVL updated: ${CVL}"
echo "Status: SUCCESS"