import struct, os, hashlib
BASE=os.path.expanduser('~/Development/PSP')
SRC='/tmp/Blade.ctf'
import shutil
src = SRC if os.path.exists(SRC) else None
if not src:
    raise SystemExit('Blade.ctf not on aurora yet')

d=open(src,'rb').read()
count=struct.unpack_from('<I',d,0x18)[0]
to=len(d)-count*72
ents=[]
for i in range(count):
    o=to+i*72
    name=d[o:o+64].split(b'\0')[0].decode('utf8')
    ents.append((name, struct.unpack_from('<II',d,o+64)))
def blob(name):
    e=[x for x in ents if x[0].lower()==name.lower()][0]
    s,sz=e[1]
    nxt=min([ss for n,(ss,_) in ents if ss>s]+[len(d)])
    return d[s:nxt], sz
def recs(name):
    b,sz=blob(name); cur=0; out=[]
    for _ in range(sz):
        off,ssz=struct.unpack_from('<II',b,cur); cur+=8
        out.append((off, b[cur:cur+ssz])); cur+=ssz
    return out

MODS={
 '/vsh/module/vshmain.prx': ('firmware/6.61/extracted/F0/vsh/module/vshmain.prx', 0xa0),
 '/vsh/module/paf.prx':     ('firmware/6.61/extracted/F0/vsh/module/paf.prx', 0xc0),
}
clean660={
 '/vsh/module/vshmain.prx': ('firmware/6.60/extracted/F0/vsh/module/vshmain.prx', 0xa0),
 '/vsh/module/paf.prx':     ('firmware/6.60/extracted/F0/vsh/module/paf.prx', 0xc0),
}
allok=True
for res,(c61p,sub) in MODS.items():
    c61=open(os.path.join(BASE,c61p),'rb').read()
    c60=open(os.path.join(BASE,clean660[res][0]),'rb').read()
    diff_bytes=set(i for i in range(min(len(c60),len(c61))) if c60[i]!=c61[i])
    print('===',res,'6.60 vs 6.61 differing bytes:',[hex(x) for x in sorted(diff_bytes)])
    rr=recs(res)
    bad=0
    for off,patch in rr:
        fo=off+sub
        if fo<0 or fo+len(patch)>len(c61):
            print('   OUT OF RANGE off=0x%08x file=0x%x len=%d'%(off,fo,len(patch))); bad+=1; continue
        if fo in diff_bytes or any((fo+k) in diff_bytes for k in range(len(patch))):
            print('   !! COLLIDES with 6.60/6.61 difference at off=0x%08x file=0x%x'%(off,fo)); bad+=1
    print('   %d records, %d problematic'%(len(rr),bad))
    if bad: allok=False
print()
print('SAFE FOR 6.61:', allok)
