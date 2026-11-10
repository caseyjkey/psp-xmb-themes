#!/usr/bin/env python3
"""Retarget a CXMB CTF theme to a different PSP firmware version.

CXMB themes carry a firmware magic (0xDEAD0660 for 6.60, 0xDEAD0661 for 6.61)
and, for three patched modules, a list of diff records written into the running
module at load time. This script:

  * rewrites the magic and re-signs the resource header table,
  * drops diff records that cannot apply to the target firmware,
  * optionally drops or replaces whole resources.

Use it to port a 6.60 theme to 6.61 without hand-editing binary offsets.

Examples
--------
Retarget for 6.61, dropping the legacy font so the stock PSP font is used:

    python3 scripts/retarget-ctf-for-firmware.py in.ctf out.ctf --target 6.61 \
        --drop /font/LTN0.PGF

Retarget and swap in a rebuilt foreground:

    python3 scripts/retarget-ctf-for-firmware.py in.ctf out.ctf --target 6.61 \
        --replace /vsh/resource/system_plugin_fg.rco=clean_fg.rco
"""
import argparse
import hashlib
import os
import struct
import sys

HEADER_SIZE = 72

MAGIC_BY_FIRMWARE = {
    "6.60": 0xDEAD0660,
    "6.61": 0xDEAD0661,
}

# Patched modules and the text-segment base used to convert a runtime
# (text-relative) patch offset into a file offset.
PATCHED_MODULES = {
    "/vsh/module/vshmain.prx": ("vshmain.prx", 0xA0),
    "/vsh/module/paf.prx": ("paf.prx", 0xC0),
    "/vsh/module/common_gui.prx": ("common_gui.prx", 0x10),
}


def read_theme(path):
    data = bytearray(open(path, "rb").read())
    magic = struct.unpack_from("<I", data, 0x10)[0]
    count = struct.unpack_from("<I", data, 0x18)[0]
    ptf_size = struct.unpack_from("<I", data, 0x1C)[0]
    table_offset = len(data) - count * HEADER_SIZE
    entries = []
    for i in range(count):
        offset = table_offset + i * HEADER_SIZE
        name = data[offset:offset + 64].split(b"\0")[0].decode("utf-8")
        start, size = struct.unpack_from("<II", data, offset + 64)
        entries.append([name, start, size])
    return data, magic, ptf_size, entries


def entry_data(data, entries, name):
    entry = next(e for e in entries if e[0].lower() == name.lower())
    start = entry[1]
    next_start = min([e[1] for e in entries if e[1] > start] + [len(data)])
    return data[start:next_start]


def parse_records(blob, count):
    cursor = 0
    records = []
    for _ in range(count):
        offset, size = struct.unpack_from("<II", blob, cursor)
        cursor += 8
        records.append((offset, blob[cursor:cursor + size]))
        cursor += size
    return records


def build_records(records):
    return b"".join(struct.pack("<II", off, len(patch)) + patch for off, patch in records)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="source .ctf")
    parser.add_argument("output", help="destination .ctf")
    parser.add_argument("--target", required=True, choices=sorted(MAGIC_BY_FIRMWARE),
                        help="target firmware version")
    parser.add_argument("--drop", action="append", default=[], metavar="RESOURCE",
                        help="drop a resource, e.g. /font/LTN0.PGF (repeatable)")
    parser.add_argument("--replace", action="append", default=[], metavar="RESOURCE=FILE",
                        help="replace a resource with a local file (repeatable)")
    parser.add_argument("--drop-negative-offsets", action="store_true",
                        help="drop diff records whose offset resolves outside the "
                             "target module (for example the 0xffffff60 header record)")
    parser.add_argument("--firmware-dir", default=None,
                        help="directory holding extracted 6.60/6.61 modules, used to "
                             "validate patch offsets (default: ./firmware)")
    args = parser.parse_args()

    data, magic, ptf_size, entries = read_theme(args.input)
    print("source magic=0x%08x resources=%d size=%d" % (magic, len(entries), len(data)))

    drops = {d.lower() for d in args.drop}
    replacements = {}
    for item in args.replace:
        name, _, path = item.partition("=")
        if not path:
            parser.error("--replace expects RESOURCE=FILE")
        replacements[name.lower()] = path

    def module_path(filename):
        if not args.firmware_dir:
            return None
        for fw in ("6.61", "6.60"):
            candidate = os.path.join(args.firmware_dir, fw, "extracted", "F0", "vsh", "module", filename)
            if os.path.exists(candidate):
                return candidate
        return None

    payloads = []
    for entry in entries:
        name, start, size = entry[0], entry[1], entry[2]
        if name.lower() in drops:
            print("drop  %s" % name)
            continue
        blob = entry_data(data, entries, name)
        if name in PATCHED_MODULES:
            filename, text_base = PATCHED_MODULES[name]
            target = module_path(filename)
            records = parse_records(blob, size)
            if target is None:
                print("keep  %-28s records=%d (no firmware dir, offsets unverified)" % (name, len(records)))
            else:
                clean = open(target, "rb").read()
                keep = []
                for offset, patch in records:
                    signed = offset - 0x100000000 if offset >= 0x80000000 else offset
                    file_offset = signed + text_base
                    if file_offset < 0 or file_offset + len(patch) > len(clean):
                        print("  drop record off=0x%08x in %s (outside target module)" % (offset, name))
                        continue
                    if args.drop_negative_offsets and signed < 0:
                        print("  drop record off=0x%08x in %s (negative/header offset)" % (offset, name))
                        continue
                    keep.append((offset, patch))
                blob = build_records(keep)
                size = len(keep)
                print("keep  %-28s records=%d -> %d" % (name, len(records), size))
        replacement = replacements.get(name.lower())
        if replacement:
            blob = open(replacement, "rb").read()
            size = len(blob)
            print("replace %s (%d bytes)" % (name, size))
        payloads.append([name, blob, size])

    out = bytearray(data[:ptf_size])
    cursor = ptf_size
    new_entries = []
    for name, blob, size in payloads:
        new_entries.append([name, cursor, size])
        out += blob
        cursor += len(blob)

    header = bytearray()
    for name, start, size in new_entries:
        record = bytearray(HEADER_SIZE)
        encoded = name.encode("utf-8")[:63]
        record[0:len(encoded)] = encoded
        struct.pack_into("<I", record, 64, start)
        struct.pack_into("<I", record, 68, size)
        header += record

    digest = hashlib.sha1(bytes(header)).digest()
    struct.pack_into("<I", out, 0x10, MAGIC_BY_FIRMWARE[args.target])
    struct.pack_into("<I", out, 0x14, struct.unpack_from("<I", digest, 0)[0])
    struct.pack_into("<I", out, 0x18, len(new_entries))
    struct.pack_into("<I", out, 0x1C, ptf_size)
    out += header

    with open(args.output, "wb") as handle:
        handle.write(bytes(out))
    print()
    print("wrote %s size=%d sha256=%s" % (args.output, len(out), hashlib.sha256(bytes(out)).hexdigest()))


if __name__ == "__main__":
    main()
