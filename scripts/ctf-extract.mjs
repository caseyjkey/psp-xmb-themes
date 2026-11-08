#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HEADER_SIZE = 72;

function usage() {
  console.error("usage: node scripts/ctf-extract.mjs <theme.ctf> <out-dir>");
  process.exit(2);
}

function readCString(buffer, offset, length) {
  const end = buffer.indexOf(0, offset);
  const stop = end >= offset && end < offset + length ? end : offset + length;
  return buffer.subarray(offset, stop).toString("utf8");
}

const [input, outDir] = process.argv.slice(2);
if (!input || !outDir) usage();

const buffer = await readFile(input);
if (buffer.length < 0x20) {
  throw new Error(`Not a valid CTF: ${input}`);
}

const magic = buffer.readUInt32LE(0x10);
const count = buffer.readUInt32LE(0x18);
const ptfSize = buffer.readUInt32LE(0x1c);
const tableSize = count * HEADER_SIZE;
if (count < 1 || count > 64 || tableSize > buffer.length) {
  throw new Error(`Invalid CTF resource count ${count}: ${input}`);
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "base.ptf"), buffer.subarray(0, ptfSize));

const tableOffset = buffer.length - tableSize;
const manifest = {
  input,
  magic: `0x${magic.toString(16)}`,
  count,
  ptfSize,
  entries: [],
};

function getEntryData(entry, entries) {
  const nextStart = entries
    .filter((item) => item.start > entry.start)
    .map((item) => item.start)
    .sort((a, b) => a - b)[0] ?? tableOffset;
  return buffer.subarray(entry.start, nextStart);
}

const entries = [];
for (let i = 0; i < count; i += 1) {
  const offset = tableOffset + i * HEADER_SIZE;
  entries.push({
    name: readCString(buffer, offset, 64),
    start: buffer.readUInt32LE(offset + 64),
    size: buffer.readUInt32LE(offset + 68),
  });
}

for (const entry of entries) {
  const { name, start, size } = entry;
  const rel = name.replace(/^\/+/, "");
  const dest = path.join(outDir, rel);
  const data = getEntryData(entry, entries);

  if (start < ptfSize || start + data.length > tableOffset) {
    manifest.entries.push({ name, start, size, extracted: false, reason: "entry exceeds data area" });
    continue;
  }

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, data);
  manifest.entries.push({ name, start, size, dataSize: data.length, extracted: true, path: rel });
}

await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`extracted ${manifest.entries.filter((entry) => entry.extracted).length}/${count} resources to ${outDir}`);
