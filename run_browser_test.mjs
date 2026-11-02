import http from "http";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import worker from "./worker.js";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:8080");

  if (url.pathname.startsWith("/api/")) {
    let bodyBuffer = Buffer.alloc(0);
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      bodyBuffer = Buffer.concat(chunks);
    }
    const workerReq = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: bodyBuffer.length > 0 ? bodyBuffer : undefined
    });
    const resp = await worker.fetch(workerReq, {});
    const respBody = await resp.text();
    const headers = Object.fromEntries(resp.headers.entries());
    res.writeHead(resp.status, headers);
    res.end(respBody);
    return;
  }

  let filePath = path.join(process.cwd(), url.pathname === "/" ? "index.html" : url.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = ext === ".html" ? "text/html" : ext === ".css" ? "text/css" : ext === ".js" ? "application/javascript" : "text/plain";
    res.writeHead(200, { "Content-Type": mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(8080, () => {
  console.log("Local test server running at http://localhost:8080");

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const cmd = `"${edgePath}" --headless=new --dump-dom http://localhost:8080`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error("Browser exec error:", err);
      server.close();
      process.exit(1);
    }

    console.log("Headless Edge rendered page successfully!");
    console.log("DOM output size:", stdout.length, "bytes");

    const checks = [
      ["ЧОЛПОНКА", stdout.includes("ЧОЛПОНКА")],
      ["dbSyncStatusBar", stdout.includes("dbSyncStatusBar")],
      ["timeline-card", stdout.includes("timeline-card")],
      ["vote-card", stdout.includes("vote-card")],
      ["contestant-card", stdout.includes("contestant-card")]
    ];

    let allPassed = true;
    for (const [name, passed] of checks) {
      console.log(`- Check '${name}':`, passed ? "✅ PASSED" : "❌ FAILED");
      if (!passed) allPassed = false;
    }

    server.close(() => {
      if (allPassed) {
        console.log("\n🎉 HEADLESS BROWSER VERIFICATION 100% SUCCESSFUL!");
        process.exit(0);
      } else {
        process.exit(1);
      }
    });
  });
});
