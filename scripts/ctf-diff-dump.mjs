#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const HEADER_SIZE = 72;

function usage() {
  console.error("usage: node scripts/ctf-diff-dump.mjs <theme.ctf> <resource-path> [...]");
  process.exit(2);
}

function readCString(buffer, offset, length) {
  const end = buffer.indexOf(0, offset);
  const stop = end >= offset && end < offset + length ? end : offset + length;
  return buffer.subarray(offset, stop).toString("utf8");
}

function hex(buffer) {
  return [...buffer].map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

const [input, ...resourceArgs] = process.argv.slice(2);
if (!input || resourceArgs.length === 0) usage();

const buffer = await readFile(input);
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

for (const requested of resourceArgs) {
  const entry = entries.find((item) => item.name.toLowerCase() === requested.toLowerCase());
  if (!entry) {
    console.log(`${path.basename(input)} ${requested}: missing`);
    continue;
  }

  const nextStart = entries
    .filter((item) => item.start > entry.start)
    .map((item) => item.start)
    .sort((a, b) => a - b)[0] ?? tableOffset;
  const data = buffer.subarray(entry.start, nextStart);
  console.log(`${path.basename(input)} ${entry.name}: ${entry.size} record(s), ${data.length} data bytes`);
  let cursor = 0;
  let record = 0;
  while (record < entry.size && cursor + 8 <= data.length) {
    const offset = data.readUInt32LE(cursor);
    const size = data.readUInt32LE(cursor + 4);
    cursor += 8;
    if (cursor + size > data.length) {
      console.log(`  #${record} malformed offset=0x${offset.toString(16).padStart(8, "0")} size=${size} exceeds entry data`);
      break;
    }
    const patch = data.subarray(cursor, cursor + size);
    cursor += size;
    console.log(`  #${record} offset=0x${offset.toString(16).padStart(8, "0")} size=${size} bytes=${hex(patch)}`);
    record += 1;
  }
  if (cursor !== data.length) {
    console.log(`  trailing ${data.length - cursor} byte(s): ${hex(data.subarray(cursor))}`);
  }
}
