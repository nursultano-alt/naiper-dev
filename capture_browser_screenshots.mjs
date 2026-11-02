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
  const desktopIvoryFile = path.resolve(process.cwd(), "screenshot_desktop_ivory.png");
  const mobileIvoryFile = path.resolve(process.cwd(), "screenshot_mobile_ivory.png");
  const mobileObsidianFile = path.resolve(process.cwd(), "screenshot_mobile_obsidian.png");

  try {
    // 1. Desktop Gilded Ivory (1440x1080)
    console.log("📸 Capturing Desktop: Gilded Ivory (☀️ Слоновая кость 1440x1080)...");
    const cmdIvory = `"${edgePath}" --headless=new --hide-scrollbars --virtual-time-budget=2000 --window-size=1440,1080 --screenshot="${ivoryFile}" "http://localhost:${PORT}/?theme=ivory"`;
    await runCommand(cmdIvory);
    fs.copyFileSync(ivoryFile, desktopIvoryFile);
    console.log(`✅ Desktop Ivory screenshot saved: ${ivoryFile} (${fs.statSync(ivoryFile).size} bytes)`);

    // 2. Desktop Warm Obsidian (1440x1080)
    console.log("📸 Capturing Desktop: Warm Obsidian (🌙 Теплый обсидиан 1440x1080)...");
    const cmdObsidian = `"${edgePath}" --headless=new --hide-scrollbars --virtual-time-budget=2000 --window-size=1440,1080 --screenshot="${obsidianFile}" "http://localhost:${PORT}/?theme=obsidian"`;
    await runCommand(cmdObsidian);
    console.log(`✅ Desktop Obsidian screenshot saved: ${obsidianFile} (${fs.statSync(obsidianFile).size} bytes)`);

    // 3. Mobile Gilded Ivory (480x960 Mobile-First)
    console.log("📸 Capturing Mobile: Gilded Ivory (☀️ 480x960 Mobile-First)...");
    const cmdMobileIvory = `"${edgePath}" --headless=new --hide-scrollbars --virtual-time-budget=2000 --window-size=480,960 --screenshot="${mobileIvoryFile}" "http://localhost:${PORT}/?theme=ivory"`;
    await runCommand(cmdMobileIvory);
    console.log(`✅ Mobile Ivory screenshot saved: ${mobileIvoryFile} (${fs.statSync(mobileIvoryFile).size} bytes)`);

    // 4. Mobile Warm Obsidian (480x960 Mobile-First)
    console.log("📸 Capturing Mobile: Warm Obsidian (🌙 480x960 Mobile-First)...");
    const cmdMobileObsidian = `"${edgePath}" --headless=new --hide-scrollbars --virtual-time-budget=2000 --window-size=480,960 --screenshot="${mobileObsidianFile}" "http://localhost:${PORT}/?theme=obsidian"`;
    await runCommand(cmdMobileObsidian);
    console.log(`✅ Mobile Obsidian screenshot saved: ${mobileObsidianFile} (${fs.statSync(mobileObsidianFile).size} bytes)`);

    console.log("\n🎉 ALL DESKTOP AND MOBILE SCREENSHOTS CAPTURED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Screenshot capture error:", err);
  } finally {
    server.close();
    process.exit(0);
  }
});
