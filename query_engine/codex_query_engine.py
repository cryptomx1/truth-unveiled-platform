from flask import Flask, request, jsonify
import json, glob, os
from datetime import datetime

app = Flask(__name__)
CODEX_PATH = "/home/mark/projects/truth-unveiled/memory/codex/"
INDEX_PATH = os.path.join(CODEX_PATH, "codex_index.jsonl")

def load_codex():
    segments = []
    for file in glob.glob(os.path.join(CODEX_PATH, "segment_*.json")):
        with open(file, "r") as f:
            try:
                segments.append(json.load(f))
            except:
                pass
    return segments

def search_codex(query):
    results = []
    segments = load_codex()
    for seg in segments:
        text = json.dumps(seg).lower()
        if query.lower() in text:
            results.append(seg)
    return results

@app.route("/codex/query", methods=["POST"])
def query_codex():
    data = request.get_json()
    query = data.get("query", "")
    results = search_codex(query)
    return jsonify({
        "timestamp": datetime.utcnow().isoformat(),
        "query": query,
        "results_count": len(results),
        "results": results[:10]
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7072)