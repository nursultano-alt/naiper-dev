import http from "http";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const PORT = 8089;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = path.join(process.cwd(), url.pathname === "/" ? "index.html" : url.pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = ext === ".html" ? "text/html; charset=utf-8" : ext === ".css" ? "text/css; charset=utf-8" : ext === ".js" ? "application/javascript; charset=utf-8" : "text/plain";
    res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-store" });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
}

server.listen(PORT, async () => {
  console.log(`🚀 Screenshot server started on http://localhost:${PORT}`);
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  const ivoryFile = path.resolve(process.cwd(), "screenshot_gilded_ivory.png");
  const obsidianFile = path.resolve(process.cwd(), "screenshot_warm_obsidian.png");

  try {
    console.log("📸 Capturing Theme 2: Gilded Ivory (☀️ Слоновая кость)...");
    const cmdIvory = `"${edgePath}" --headless=new --hide-scrollbars --window-size=1280,950 --screenshot="${ivoryFile}" "http://localhost:${PORT}/?theme=ivory"`;
    await runCommand(cmdIvory);
    const ivoryStats = fs.statSync(ivoryFile);
    console.log(`✅ Gilded Ivory screenshot saved: ${ivoryFile} (${ivoryStats.size} bytes)`);

    console.log("📸 Capturing Theme 3: Warm Obsidian (🌙 Теплый обсидиан)...");
    const cmdObsidian = `"${edgePath}" --headless=new --hide-scrollbars --window-size=1280,950 --screenshot="${obsidianFile}" "http://localhost:${PORT}/?theme=obsidian"`;
    await runCommand(cmdObsidian);
    const obsidianStats = fs.statSync(obsidianFile);
    console.log(`✅ Warm Obsidian screenshot saved: ${obsidianFile} (${obsidianStats.size} bytes)`);

    console.log("\n🎉 BOTH REAL BROWSER SCREENSHOTS CAPTURED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Screenshot capture error:", err);
  } finally {
    server.close();
    process.exit(0);
  }
});
