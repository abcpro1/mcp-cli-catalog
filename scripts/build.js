import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");
const binDir = path.join(root, "bin");

async function ensureDist() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
}

async function copySource() {
  const srcFile = path.join(srcDir, "index.js");
  const destFile = path.join(distDir, "index.js");
  await fs.copyFile(srcFile, destFile);
}

async function makeBinExecutable() {
  const binScript = path.join(binDir, "mcp-cli-catalog.js");
  await fs.chmod(binScript, 0o755);
}

async function build() {
  await ensureDist();
  await copySource();
  await makeBinExecutable();
  console.log("Build complete.");
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
