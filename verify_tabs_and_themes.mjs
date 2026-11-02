import http from "http";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const PORT = 8091;
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
  console.log(`Verification server running on http://localhost:${PORT}`);
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  try {
    // 1. Verify default theme Ivory
    const resIvory = await runCommand(`"${edgePath}" --headless=new --dump-dom "http://localhost:${PORT}/?theme=ivory"`);
    const hasDataThemeIvory = resIvory.stdout.includes('data-theme="ivory"');
    console.log("- Data-theme Ivory:", hasDataThemeIvory ? "✅ PASSED" : "❌ FAILED");

    // 2. Verify Obsidian theme
    const resObsidian = await runCommand(`"${edgePath}" --headless=new --dump-dom "http://localhost:${PORT}/?theme=obsidian"`);
    const hasDataThemeObsidian = resObsidian.stdout.includes('data-theme="obsidian"');
    console.log("- Data-theme Obsidian:", hasDataThemeObsidian ? "✅ PASSED" : "❌ FAILED");

    // 3. Verify all 4 tabs exist in DOM
    const hasTimeline = resIvory.stdout.includes('id="tab-timeline"');
    const hasVoting = resIvory.stdout.includes('id="tab-voting"');
    const hasContest = resIvory.stdout.includes('id="tab-contest"');
    const hasAdmin = resIvory.stdout.includes('id="tab-admin"');
    console.log("- Tab Timeline:", hasTimeline ? "✅ PASSED" : "❌ FAILED");
    console.log("- Tab Voting:", hasVoting ? "✅ PASSED" : "❌ FAILED");
    console.log("- Tab Contest:", hasContest ? "✅ PASSED" : "❌ FAILED");
    console.log("- Tab Admin (Чолпонка):", hasAdmin ? "✅ PASSED" : "❌ FAILED");

    if (hasDataThemeIvory && hasDataThemeObsidian && hasTimeline && hasVoting && hasContest && hasAdmin) {
      console.log("\n🎉 ALL THEMES AND TABS DEEPLY VERIFIED!");
    }
  } catch (e) {
    console.error("Test error:", e);
  } finally {
    server.close();
    process.exit(0);
  }
});
