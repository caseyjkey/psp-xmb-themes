#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HEADER_SIZE = 72;

function usage() {
  console.error("usage: node scripts/ctf-diff-subset.mjs <base.ctf> <source.ctf> <resource-path> <record-list> <output.ctf>");
  console.error("record-list example: 0,1,4-7");
  process.exit(2);
}

function readCString(buffer, offset, length) {
  const end = buffer.indexOf(0, offset);
  const stop = end >= offset && end < offset + length ? end : offset + length;
  return buffer.subarray(offset, stop).toString("utf8");
}

function parseRanges(spec) {
  const selected = new Set();
  for (const part of spec.split(",")) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((value) => Number.parseInt(value, 10));
      for (let i = start; i <= end; i += 1) selected.add(i);
    } else {
      selected.add(Number.parseInt(part, 10));
    }
  }
  return selected;
}

function parseEntries(buffer) {
  const count = buffer.readUInt32LE(0x18);
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
  return { entries, tableOffset };
}

function getEntryData(buffer, parsed, entry) {
  const nextStart = parsed.entries
    .filter((item) => item.start > entry.start)
    .map((item) => item.start)
    .sort((a, b) => a - b)[0] ?? parsed.tableOffset;
  return buffer.subarray(entry.start, nextStart);
}

function parseDiffRecords(buffer, parsed, entry) {
  const blob = getEntryData(buffer, parsed, entry);
  const records = [];
  let cursor = 0;
  for (let i = 0; i < entry.size; i += 1) {
    const offset = blob.readUInt32LE(cursor);
    const size = blob.readUInt32LE(cursor + 4);
    const end = cursor + 8 + size;
    records.push(Buffer.from(blob.subarray(cursor, end)));
    cursor = end;
  }
  return records;
}

function writeHeader(entry) {
  const out = Buffer.alloc(HEADER_SIZE);
  out.write(entry.name, 0, Math.min(Buffer.byteLength(entry.name), 63), "utf8");
  out.writeUInt32LE(entry.start, 64);
  out.writeUInt32LE(entry.size, 68);
  return out;
}

const [basePath, sourcePath, resourceName, recordSpec, outputPath] = process.argv.slice(2);
if (!basePath || !sourcePath || !resourceName || !recordSpec || !outputPath) usage();

const base = await readFile(basePath);
const source = await readFile(sourcePath);
const baseParsed = parseEntries(base);
const sourceParsed = parseEntries(source);
const sourceEntry = sourceParsed.entries.find((entry) => entry.name.toLowerCase() === resourceName.toLowerCase());
if (!sourceEntry) throw new Error(`Missing source resource: ${resourceName}`);

const selected = parseRanges(recordSpec);
const sourceRecords = parseDiffRecords(source, sourceParsed, sourceEntry);
const keptRecords = sourceRecords.filter((_, index) => selected.has(index));
if (keptRecords.length === 0) throw new Error("No diff records selected");
const replacement = Buffer.concat(keptRecords);

let entries = baseParsed.entries.filter((entry) => entry.name.toLowerCase() !== resourceName.toLowerCase());
entries.push({ name: resourceName, start: 0, size: keptRecords.length });
entries = entries.sort((a, b) => a.name.localeCompare(b.name));

const ptfSize = base.readUInt32LE(0x1c);
const chunks = [Buffer.from(base.subarray(0, ptfSize))];
let cursor = ptfSize;
const rewritten = [];
for (const entry of entries) {
  const data = entry.name.toLowerCase() === resourceName.toLowerCase()
    ? replacement
    : Buffer.from(getEntryData(base, baseParsed, entry));
  rewritten.push({ name: entry.name, start: cursor, size: entry.size });
  chunks.push(data);
  cursor += data.length;
}

const headerTable = Buffer.concat(rewritten.map(writeHeader));
const sha1 = createHash("sha1").update(headerTable).digest();
const out = Buffer.concat(chunks);
out.writeUInt32LE(sha1.readUInt32LE(0), 0x14);
out.writeUInt32LE(rewritten.length, 0x18);
out.writeUInt32LE(ptfSize, 0x1c);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.concat([out, headerTable]));
console.log(`wrote ${outputPath}`);
console.log(`inserted ${resourceName} records ${[...selected].sort((a, b) => a - b).join(",")} (${keptRecords.length})`);
