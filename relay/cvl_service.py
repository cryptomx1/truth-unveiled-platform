from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/rollback/status", methods=["GET"])
def status():
    return jsonify({"phase": "XXII-RollbackVoteAutomator", "status": "active"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7071)