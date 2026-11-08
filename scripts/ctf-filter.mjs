#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HEADER_SIZE = 72;

const presets = {
  "no-modules": ["/vsh/module/"],
  "no-fonts": ["/font/"],
  "no-boot": ["/vsh/resource/opening_plugin.rco", "/vsh/resource/gameboot.pmf"],
  "no-xmb-core": [
    "/vsh/resource/topmenu_plugin.rco",
    "/vsh/resource/system_plugin.rco",
    "/vsh/resource/system_plugin_bg.rco",
  ],
  safe: [
    "/vsh/module/",
    "/font/",
    "/vsh/resource/opening_plugin.rco",
    "/vsh/resource/gameboot.pmf",
    "/vsh/resource/topmenu_plugin.rco",
    "/vsh/resource/system_plugin.rco",
    "/vsh/resource/system_plugin_bg.rco",
  ],
};

function usage() {
  console.error("usage: node scripts/ctf-filter.mjs <input.ctf> <output.ctf> [--preset safe|no-modules|no-fonts|no-boot|no-xmb-core] [--exclude /path]");
  process.exit(2);
}

function readCString(buffer, offset, length) {
  const end = buffer.indexOf(0, offset);
  const stop = end >= offset && end < offset + length ? end : offset + length;
  return buffer.subarray(offset, stop).toString("utf8");
}

function writeHeader(entry) {
  const out = Buffer.alloc(HEADER_SIZE);
  out.write(entry.name, 0, Math.min(Buffer.byteLength(entry.name), 63), "utf8");
  out.writeUInt32LE(entry.start, 64);
  out.writeUInt32LE(entry.size, 68);
  return out;
}

const args = process.argv.slice(2);
const input = args.shift();
const output = args.shift();
if (!input || !output) usage();

const excludes = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--preset") {
    const preset = args[++i];
    if (!presets[preset]) throw new Error(`Unknown preset: ${preset}`);
    excludes.push(...presets[preset]);
  } else if (args[i] === "--exclude") {
    excludes.push(args[++i]);
  } else {
    throw new Error(`Unknown argument: ${args[i]}`);
  }
}

if (excludes.length === 0) usage();

const buffer = await readFile(input);
const count = buffer.readUInt32LE(0x18);
const ptfSize = buffer.readUInt32LE(0x1c);
const tableOffset = buffer.length - count * HEADER_SIZE;
const entries = [];

for (let i = 0; i < count; i += 1) {
  const offset = tableOffset + i * HEADER_SIZE;
  entries.push({
    name: readCString(buffer, offset, 64),
    start: buffer.readUInt32LE(offset + 64),
    size: buffer.readUInt32LE(offset + 68),
  });
}

const kept = [];
const removed = [];
for (const entry of entries) {
  const lower = entry.name.toLowerCase();
  const matched = excludes.some((exclude) => lower.startsWith(exclude.toLowerCase()));
  if (matched) removed.push(entry);
  else kept.push(entry);
}

const chunks = [Buffer.from(buffer.subarray(0, ptfSize))];
let cursor = ptfSize;
const rewritten = [];
for (const entry of kept) {
  const data = buffer.subarray(entry.start, entry.start + entry.size);
  rewritten.push({ name: entry.name, start: cursor, size: entry.size });
  chunks.push(Buffer.from(data));
  cursor += entry.size;
}

const headerTable = Buffer.concat(rewritten.map(writeHeader));
const sha1 = createHash("sha1").update(headerTable).digest();
const header = Buffer.concat(chunks);
header.writeUInt32LE(sha1.readUInt32LE(0), 0x14);
header.writeUInt32LE(rewritten.length, 0x18);
header.writeUInt32LE(ptfSize, 0x1c);

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, Buffer.concat([header, headerTable]));

console.log(`wrote ${output}`);
console.log(`kept ${kept.length}/${entries.length}, removed ${removed.length}`);
for (const entry of removed) console.log(`  removed ${entry.name}`);
