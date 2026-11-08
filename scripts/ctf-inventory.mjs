#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const HEADER_SIZE = 72;
const MAGIC_BY_VALUE = new Map([
  [0xdead0371, "3.71"],
  [0xdead0390, "3.90"],
  [0xdead0401, "4.01"],
  [0xdead0500, "5.00"],
  [0xdead0502, "5.02"],
  [0xdead0503, "5.03"],
  [0xdead0550, "5.50"],
  [0xdead0620, "6.20"],
  [0xdead0631, "6.31"],
  [0xdead0635, "6.35"],
  [0xdead0637, "6.37"],
  [0xdead0638, "6.38"],
  [0xdead0639, "6.39"],
  [0xdead0660, "6.60"],
  [0xdead0661, "6.61"],
]);

const riskyNames = [
  "/vsh/module/",
  "/font/",
  "/vsh/resource/topmenu_plugin.rco",
  "/vsh/resource/system_plugin.rco",
  "/vsh/resource/system_plugin_bg.rco",
  "/vsh/resource/opening_plugin.rco",
  "/vsh/resource/gameboot.pmf",
];

function readCString(buffer, offset, length) {
  const end = buffer.indexOf(0, offset);
  const stop = end >= offset && end < offset + length ? end : offset + length;
  return buffer.subarray(offset, stop).toString("utf8");
}

async function readTheme(file) {
  const s = await stat(file);
  if (s.size < 0x20) {
    return { file, size: s.size, valid: false, reason: "too small" };
  }

  const buffer = await readFile(file);
  const magic = buffer.readUInt32LE(0x10);
  const count = buffer.readUInt32LE(0x18);
  const ptfSize = buffer.readUInt32LE(0x1c);
  const tableSize = count * HEADER_SIZE;

  if (!MAGIC_BY_VALUE.has(magic)) {
    return { file, size: s.size, valid: false, reason: `unknown magic 0x${magic.toString(16)}` };
  }

  if (count < 1 || count > 64 || tableSize > s.size) {
    return { file, size: s.size, valid: false, reason: `bad resource count ${count}` };
  }

  const tableOffset = s.size - tableSize;
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    const offset = tableOffset + i * HEADER_SIZE;
    const name = readCString(buffer, offset, 64);
    const start = buffer.readUInt32LE(offset + 64);
    const entrySize = buffer.readUInt32LE(offset + 68);
    entries.push({ name, start, size: entrySize });
  }

  const risky = entries
    .filter((entry) => riskyNames.some((prefix) => entry.name.toLowerCase().startsWith(prefix)))
    .map((entry) => entry.name);

  return {
    file,
    size: s.size,
    valid: true,
    firmware: MAGIC_BY_VALUE.get(magic),
    magic: `0x${magic.toString(16)}`,
    count,
    ptfSize,
    entries,
    risky,
  };
}

async function listThemes(input) {
  const s = await stat(input);
  if (s.isDirectory()) {
    const names = await readdir(input);
    return names
      .filter((name) => name.toLowerCase().endsWith(".ctf") || name.toLowerCase().endsWith(".ctf.part"))
      .map((name) => path.join(input, name));
  }
  return [input];
}

const input = process.argv[2] ?? "/mnt/d/PSP/THEME";
const verbose = process.argv.includes("--verbose");
const themes = await listThemes(input);
const results = [];

for (const theme of themes.sort((a, b) => a.localeCompare(b))) {
  results.push(await readTheme(theme));
}

for (const result of results) {
  const base = path.basename(result.file);
  if (!result.valid) {
    console.log(`${base}\tINVALID\t${result.size} bytes\t${result.reason}`);
    continue;
  }
  const riskText = result.risky.length ? `risk=${result.risky.length}` : "risk=0";
  console.log(`${base}\tfw=${result.firmware}\tresources=${result.count}\tsize=${result.size}\t${riskText}`);
  if (verbose) {
    for (const entry of result.entries) {
      const marker = result.risky.includes(entry.name) ? "!" : " ";
      console.log(`  ${marker} ${entry.name}\t${entry.size}`);
    }
  }
}
