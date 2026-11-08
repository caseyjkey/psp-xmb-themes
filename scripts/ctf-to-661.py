import struct, os, hashlib
BASE=os.path.expanduser('~/Development/PSP')
src='/tmp/Blade.ctf'
dst='/tmp/Blade_661.ctf'
d=bytearray(open(src,'rb').read())
old=struct.unpack_from('<I',d,0x10)[0]
struct.pack_into('<I',d,0x10,0xDEAD0661)
# re-sign the header table (sha1 of header table lives at 0x14)
count=struct.unpack_from('<I',d,0x18)[0]
to=len(d)-count*72
hdr=bytes(d[to:to+count*72])
sha=hashlib.sha1(hdr).digest()
struct.pack_into('<I',d,0x14,struct.unpack_from('<I',sha,0)[0])
open(dst,'wb').write(bytes(d))
print('magic 0x%08x -> 0x%08x'%(old,0xDEAD0661))
print('wrote %s size=%d sha256=%s'%(dst,len(d),hashlib.sha256(bytes(d)).hexdigest()))
# sanity: verify table still parses
count2=struct.unpack_from('<I',d,0x18)[0]
to2=len(d)-count2*72
print('count=%d tableOffset=0x%x'%(count2,to2))
for i in range(count2):
    o=to2+i*72
    name=d[o:o+64].split(b'\0')[0].decode('utf8')
    print('   %-44s start=0x%06x size=%d'%(name,struct.unpack_from('<I',d,o+64)[0],struct.unpack_from('<I',d,o+68)[0]))
