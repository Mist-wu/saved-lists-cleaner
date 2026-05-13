import crypto from "node:crypto";
import { spawn } from "node:child_process";
import http from "node:http";

const port = Number(process.env.WEBHOOK_PORT ?? 9000);
const secret = process.env.WEBHOOK_SECRET;
const repoDir = process.env.REPO_DIR ?? "/opt/saved-lists-cleaner/app";

if (!secret) {
  console.error("WEBHOOK_SECRET is required.");
  process.exit(1);
}

let deploying = false;
let queued = false;

function verifySignature(body, signature) {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function runDeploy() {
  if (deploying) {
    queued = true;
    return;
  }

  deploying = true;
  const child = spawn("/bin/bash", ["/opt/saved-lists-cleaner/deploy/deploy.sh"], {
    cwd: repoDir,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    deploying = false;
    console.log(`deploy finished with code ${code}`);
    if (queued) {
      queued = false;
      runDeploy();
    }
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("ok\n");
    return;
  }

  if (request.method !== "POST" || request.url !== "/github") {
    response.writeHead(404);
    response.end("not found\n");
    return;
  }

  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    const body = Buffer.concat(chunks);
    const signature = request.headers["x-hub-signature-256"];
    if (!verifySignature(body, Array.isArray(signature) ? signature[0] : signature)) {
      response.writeHead(401);
      response.end("bad signature\n");
      return;
    }

    const event = request.headers["x-github-event"];
    if (event !== "push") {
      response.writeHead(202);
      response.end("ignored\n");
      return;
    }

    runDeploy();
    response.writeHead(202);
    response.end("deploy queued\n");
  });
});

server.listen(port, () => {
  console.log(`saved-lists-cleaner webhook listening on :${port}`);
});
