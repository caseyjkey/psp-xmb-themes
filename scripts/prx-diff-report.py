#!/usr/bin/env python3
import argparse
import struct
from pathlib import Path

from capstone import Cs, CS_ARCH_MIPS, CS_MODE_32, CS_MODE_LITTLE_ENDIAN


def parse_diff(ctf_path, resource_name):
    data = Path(ctf_path).read_bytes()
    count = struct.unpack_from("<I", data, 0x18)[0]
    table_offset = len(data) - count * 72
    entries = []
    for i in range(count):
        off = table_offset + i * 72
        raw_name = data[off : off + 64]
        name = raw_name.split(b"\0", 1)[0].decode("utf-8")
        start, size = struct.unpack_from("<II", data, off + 64)
        entries.append({"name": name, "start": start, "records": size})

    entry = next((e for e in entries if e["name"].lower() == resource_name.lower()), None)
    if not entry:
        raise SystemExit(f"missing {resource_name}")

    next_start = min([e["start"] for e in entries if e["start"] > entry["start"]] or [table_offset])
    blob = data[entry["start"] : next_start]
    cursor = 0
    records = []
    for _ in range(entry["records"]):
        offset, size = struct.unpack_from("<II", blob, cursor)
        cursor += 8
        patch = blob[cursor : cursor + size]
        cursor += size
        records.append((offset, patch))
    return records


def disassemble_around(module, file_offset, radius=24):
    md = Cs(CS_ARCH_MIPS, CS_MODE_32 + CS_MODE_LITTLE_ENDIAN)
    start = max(0, file_offset - radius)
    start &= ~3
    end = min(len(module), file_offset + radius)
    chunk = module[start:end]
    lines = []
    for insn in md.disasm(chunk, start):
        marker = "=>" if insn.address <= file_offset < insn.address + insn.size else "  "
        lines.append(f"{marker} 0x{insn.address:08x}: {insn.bytes.hex(' '):<14} {insn.mnemonic} {insn.op_str}")
    return lines


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("ctf")
    parser.add_argument("resource")
    parser.add_argument("module")
    args = parser.parse_args()

    module = Path(args.module).read_bytes()
    sub = struct.unpack_from("<I", module, 0x38)[0]
    print(f"module={args.module}")
    print(f"resource={args.resource}")
    print(f"sub=0x{sub:08x}")

    for index, (runtime_offset, patch) in enumerate(parse_diff(args.ctf, args.resource)):
        file_offset = (runtime_offset + sub) & 0xFFFFFFFF
        original = module[file_offset : file_offset + len(patch)]
        print()
        print(
            f"record #{index}: runtime=0x{runtime_offset:08x} file=0x{file_offset:08x} "
            f"size={len(patch)} original={original.hex(' ')} patch={patch.hex(' ')}"
        )
        for line in disassemble_around(module, file_offset):
            print(line)


if __name__ == "__main__":
    main()
