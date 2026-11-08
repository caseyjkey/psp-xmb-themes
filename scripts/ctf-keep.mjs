#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HEADER_SIZE = 72;

function usage() {
  console.error("usage: node scripts/ctf-keep.mjs <input.ctf> <output.ctf> <resource-path> [...]");
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

const [input, output, ...keepArgs] = process.argv.slice(2);
if (!input || !output || keepArgs.length === 0) usage();

const keep = new Set(keepArgs.map((name) => name.toLowerCase()));
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

const kept = entries.filter((entry) => keep.has(entry.name.toLowerCase()));
if (kept.length === 0) {
  throw new Error("No matching resources selected");
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
const out = Buffer.concat(chunks);
out.writeUInt32LE(sha1.readUInt32LE(0), 0x14);
out.writeUInt32LE(rewritten.length, 0x18);
out.writeUInt32LE(ptfSize, 0x1c);

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, Buffer.concat([out, headerTable]));

console.log(`wrote ${output}`);
console.log(`kept ${kept.length}/${entries.length}`);
for (const entry of kept) console.log(`  kept ${entry.name}`);
