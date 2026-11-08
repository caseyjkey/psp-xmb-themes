#!/usr/bin/env node
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const inputDir = process.argv[2] ?? "/mnt/d/PSP/THEME";
const outputDir = process.argv[3] ?? "/mnt/d/PSP/THEME/safe";
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const filterScript = path.join(scriptDir, "ctf-filter.mjs");

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${args.join(" ")} failed with ${code}\n${stdout}\n${stderr}`));
    });
  });
}

await mkdir(outputDir, { recursive: true });
const files = (await readdir(inputDir))
  .filter((name) => name.toLowerCase().endsWith(".ctf"))
  .filter((name) => !name.toLowerCase().includes("_safe"))
  .sort((a, b) => a.localeCompare(b));

for (const name of files) {
  const input = path.join(inputDir, name);
  const parsed = path.parse(name);
  const output = path.join(outputDir, `${parsed.name}_safe${parsed.ext}`);
  try {
    await run([filterScript, input, output, "--preset", "safe"]);
    console.log(`ok\t${name}\t=>\t${path.basename(output)}`);
  } catch (error) {
    console.log(`fail\t${name}\t${error.message.split("\n")[0]}`);
  }
}
