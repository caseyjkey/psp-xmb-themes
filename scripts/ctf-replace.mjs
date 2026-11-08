#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HEADER_SIZE = 72;

function usage() {
  console.error("usage: node scripts/ctf-replace.mjs <input.ctf> <output.ctf> <ctf-resource-path>=<local-file> [...]");
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

const [input, output, ...replacementArgs] = process.argv.slice(2);
if (!input || !output || replacementArgs.length === 0) usage();

const replacements = new Map();
for (const arg of replacementArgs) {
  const split = arg.indexOf("=");
  if (split < 0) usage();
  replacements.set(arg.slice(0, split).toLowerCase(), arg.slice(split + 1));
}

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

for (const [name, localFile] of replacements.entries()) {
  if (!entries.some((entry) => entry.name.toLowerCase() === name)) {
    entries.push({ name, start: 0, size: 0 });
  }
  replacements.set(name, await readFile(localFile));
}

const chunks = [Buffer.from(buffer.subarray(0, ptfSize))];
let cursor = ptfSize;
const rewritten = [];
for (const entry of entries) {
  const replacement = replacements.get(entry.name.toLowerCase());
  const data = replacement ?? buffer.subarray(entry.start, entry.start + entry.size);
  rewritten.push({ name: entry.name, start: cursor, size: data.length });
  chunks.push(Buffer.from(data));
  cursor += data.length;
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
for (const name of replacements.keys()) console.log(`  replaced ${name}`);
