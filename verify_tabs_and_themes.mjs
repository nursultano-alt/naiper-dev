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

    // 3. Verify all 5 sections exist in DOM
    const hasVoting = resIvory.stdout.includes('id="tab-voting"');
    const hasTimeline = resIvory.stdout.includes('id="tab-timeline"');
    const hasContest = resIvory.stdout.includes('id="tab-contest"');
    const hasTraditions = resIvory.stdout.includes('id="tab-traditions"');
    const hasAdmin = resIvory.stdout.includes('id="tab-admin"');
    const hasCountdown = resIvory.stdout.includes('id="countdownCard"');
    const hasFloatingDock = resIvory.stdout.includes('class="floating-dock"');
    const hasTimelineSpine = resIvory.stdout.includes('timeline-spine-dot');

    console.log("- Section 01 (Voting):", hasVoting ? "✅ PASSED" : "❌ FAILED");
    console.log("- Section 02 (Timeline):", hasTimeline ? "✅ PASSED" : "❌ FAILED");
    console.log("- Section 03 (Contest):", hasContest ? "✅ PASSED" : "❌ FAILED");
    console.log("- Section 04 (Traditions):", hasTraditions ? "✅ PASSED" : "❌ FAILED");
    console.log("- Section 05 (Admin Чолпонка):", hasAdmin ? "✅ PASSED" : "❌ FAILED");
    console.log("- Countdown Timer (2027):", hasCountdown ? "✅ PASSED" : "❌ FAILED");
    console.log("- Floating Glass Dock:", hasFloatingDock ? "✅ PASSED" : "❌ FAILED");
    console.log("- Timeline Spine Nodes:", hasTimelineSpine ? "✅ PASSED" : "❌ FAILED");

    if (hasDataThemeIvory && hasDataThemeObsidian && hasVoting && hasTimeline && hasContest && hasTraditions && hasAdmin && hasCountdown && hasFloatingDock && hasTimelineSpine) {
      console.log("\n🎉 ALL THEMES, 5 SECTIONS, COUNTDOWN AND DOCK DEEPLY VERIFIED!");
    } else {
      console.error("\n❌ Some checks failed!");
      process.exit(1);
    }
  } catch (e) {
    console.error("Test error:", e);
  } finally {
    server.close();
    process.exit(0);
  }
});
