const http = require("http");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "local-data.json");
const PORT = process.env.API_PORT || process.env.PORT || 4000;

// 状態は roomId ごとに players を保持する
let store = {};

const readStoreFromDisk = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    store = JSON.parse(raw);
  } catch {
    store = {};
  }
};

const writeStoreToDisk = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist data:", err);
  }
};

const sendJson = (res, statusCode, body) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get("roomId") || "default";
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${url.pathname} roomId=${roomId}`
  );

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (url.pathname !== "/") {
    sendJson(res, 404, { error: "Not Found" });
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, { players: store[roomId] || [] });
    return;
  }

  if (req.method === "POST") {
    let rawBody = "";
    req.on("data", (chunk) => {
      rawBody += chunk.toString("utf-8");
    });

    req.on("end", () => {
      try {
        const parsed = JSON.parse(rawBody || "{}");
        if (!Array.isArray(parsed.players)) {
          sendJson(res, 400, { error: "Invalid payload: players must be array" });
          return;
        }
        store[roomId] = parsed.players;
        writeStoreToDisk();
        sendJson(res, 200, { ok: true });
      } catch (err) {
        console.error("Failed to parse request body", err);
        sendJson(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  sendJson(res, 405, { error: "Method Not Allowed" });
});

readStoreFromDisk();
server.listen(PORT, () => {
  console.log(`Local API server listening on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
