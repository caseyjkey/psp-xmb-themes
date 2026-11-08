import struct, os, sys
from capstone import Cs, CS_ARCH_MIPS, CS_MODE_32, CS_MODE_LITTLE_ENDIAN
BASE=os.path.expanduser('~/Development/PSP')
clean=open(os.path.join(BASE,'firmware/6.61/extracted/F0/vsh/module/paf.prx'),'rb').read()
SUB=struct.unpack_from('<I',clean,0x38)[0]
md=Cs(CS_ARCH_MIPS, CS_MODE_32+CS_MODE_LITTLE_ENDIAN)

def dis_at(fo, radius=48):
    start=max(SUB, fo-radius); start&=~3
    end=min(len(clean), fo+radius)
    out=[]
    for ins in md.disasm(clean[start:end], start-SUB):
        m='=>' if ins.address+SUB<=fo<ins.address+SUB+ins.size else '  '
        out.append('%s 0x%08x: %-14s %s %s'%(m,ins.address+SUB,ins.bytes.hex(' '),ins.mnemonic,ins.op_str))
    return out

# The theme's paf records and their meaning
records=[
 (0x001066f4,'0000'),(0x00106708,'0000'),(0x00106908,'0000'),(0x0010693c,'0000'),
 (0x0010a23c,'2041'),(0x0010a27c,'2041'),(0x0010a6f4,'8c'),(0x0010a9dc,'1643'),
 (0x001186d4,'a041'),(0x001186d8,'0000'),(0x00129a4c,'1843'),
 (0x0012b290,'0000'),(0x0012b294,'0000'),
]
print('=== THEME PAF RECORDS: what each patch does ===')
for off,hexpatch in records:
    fo=off+SUB
    orig=clean[fo:fo+len(hexpatch)//2]
    patch=bytes.fromhex(hexpatch)
    print('\n--- off 0x%08x file 0x%06x  orig=%s -> patch=%s'%(off,fo,orig.hex(),patch.hex()))
    for l in dis_at(fo, 40): print('   ',l)
