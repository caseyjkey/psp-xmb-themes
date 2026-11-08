#!/usr/bin/env python3
"""Build a CXMB CTF that moves USB Connection to the top of the XMB Settings column.

The XMB Settings item order lives in vshmain.prx as two parallel arrays:
  - entry table, file offset 0x54BC0, 16 bytes/row: category, subcategory,
    model rights, region rights
  - icon table,  file offset 0x55024, 20 bytes/row: main icon ptr, focus ptr,
    model rights, region rights, shadow icon ptr

The arrays are parallel (entry row i model/region == icon row i model/region),
so rows must be swapped in BOTH or labels and icons desynchronise.

Usage:
  python3 build-settings-reorder.py <base.ctf> <output.ctf>
"""
import struct, os, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
VSH_661 = os.path.expanduser('~/Development/PSP/firmware/6.61/extracted/F0/vsh/module/vshmain.prx')

TBL = 0x54BC0      # entry rows, 16 bytes each
ICONS = 0x55024    # icon rows, 20 bytes each
N = 14             # Settings rows
SUB = 0xa0         # vshmain.prx text base -> runtime offset = file offset - SUB

DIFF_NAMES = {'/vsh/module/paf.prx', '/vsh/module/common_gui.prx', '/vsh/module/vshmain.prx'}


def load_ctf(path):
    b = open(path, 'rb').read()
    magic = struct.unpack_from('<I', b, 0x10)[0]
    count = struct.unpack_from('<I', b, 0x18)[0]
    ptf = struct.unpack_from('<I', b, 0x1c)[0]
    to = len(b) - count * 72
    ents = []
    for i in range(count):
        o = to + i * 72
        name = b[o:o + 64].split(b'\0')[0].decode('utf8')
        ents.append([name, struct.unpack_from('<I', b, o + 64)[0],
                     struct.unpack_from('<I', b, o + 68)[0]])
    return b, magic, ptf, ents


def blob_of(b, ents, name):
    e = [x for x in ents if x[0].lower() == name.lower()][0]
    nxt = min([s for n, s, _ in ents if s > e[1]] + [len(b)])
    return b[e[1]:nxt]


def parse_recs(blob, n):
    cur = 0
    out = []
    for _ in range(n):
        off, sz = struct.unpack_from('<II', blob, cur)
        cur += 8
        out.append([off, bytearray(blob[cur:cur + sz])])
        cur += sz
    return out


def write_ctf(base, magic, ptf, payloads, outpath):
    out = bytearray(base[:ptf])
    cur = ptf
    ents = []
    for n, blob, size in payloads:
        ents.append([n, cur, size])
        out += blob
        cur += len(blob)
    hdr = bytearray()
    for n, s, size in ents:
        h = bytearray(72)
        nb = n.encode('utf8')[:63]
        h[0:len(nb)] = nb
        struct.pack_into('<I', h, 64, s)
        struct.pack_into('<I', h, 68, size)
        hdr += h
    sha = hashlib.sha1(bytes(hdr)).digest()
    struct.pack_into('<I', out, 0x10, magic)
    struct.pack_into('<I', out, 0x14, struct.unpack_from('<I', sha, 0)[0])
    struct.pack_into('<I', out, 0x18, len(ents))
    struct.pack_into('<I', out, 0x1c, ptf)
    out += hdr
    os.makedirs(os.path.dirname(outpath) or '.', exist_ok=True)
    open(outpath, 'wb').write(bytes(out))
    return bytes(out)


def reorder_records():
    orig = bytearray(open(VSH_661, 'rb').read())
    d = bytearray(orig)
    ent = [bytes(d[TBL + i * 16:TBL + (i + 1) * 16]) for i in range(N)]
    ico = [bytes(d[ICONS + i * 20:ICONS + (i + 1) * 20]) for i in range(N)]
    for i in range(N):
        assert struct.unpack_from('<II', ent[i], 8) == struct.unpack_from('<II', ico[i], 8), i
    perm = [1, 0] + list(range(2, N))          # USB Connection (1) -> top
    for i in range(N):
        d[TBL + i * 16:TBL + (i + 1) * 16] = ent[perm[i]]
        d[ICONS + i * 20:ICONS + (i + 1) * 20] = ico[perm[i]]
    recs = []
    i = 0
    while i < len(d):
        if d[i] != orig[i]:
            j = i
            while j < len(d) and d[j] != orig[j]:
                j += 1
            recs.append([i - SUB, bytearray(d[i:j])])
            i = j
        else:
            i += 1
    return recs


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        raise SystemExit(2)
    base_ctf, outpath = sys.argv[1], sys.argv[2]
    b, magic, ptf, ents = load_ctf(base_ctf)
    recs = reorder_records()
    print('settings-reorder records: %s' % [(hex(o), bytes(x).hex()) for o, x in recs])

    payloads = []
    names = [e[0] for e in ents]
    for n, s, sz in ents:
        if n == '/vsh/module/vshmain.prx':
            rr = parse_recs(blob_of(b, ents, n), sz)
            have = {(o, bytes(x)) for o, x in rr}
            for o, x in recs:
                if (o, bytes(x)) not in have:
                    rr.append([o, bytearray(x)])
            blob = b''.join(struct.pack('<II', o, len(x)) + bytes(x) for o, x in rr)
            payloads.append([n, blob, len(rr)])
            print('vshmain records %d -> %d' % (sz, len(rr)))
        else:
            payloads.append([n, b[s:s + sz], sz])
    if '/vsh/module/vshmain.prx' not in names:
        blob = b''.join(struct.pack('<II', o, len(x)) + bytes(x) for o, x in recs)
        payloads.append(['/vsh/module/vshmain.prx', blob, len(recs)])
        print('vshmain ADDED with %d records' % len(recs))

    out = write_ctf(b, magic, ptf, payloads, outpath)
    print('wrote %s (%d bytes) sha256=%s' % (outpath, len(out), hashlib.sha256(out).hexdigest()))


if __name__ == '__main__':
    main()
