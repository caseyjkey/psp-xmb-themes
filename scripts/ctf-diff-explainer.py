import struct, os
BASE=os.path.expanduser('~/Development/PSP')
CLEAN='firmware/6.61/extracted/F0/vsh/module/paf.prx'
clean=open(os.path.join(BASE,CLEAN),'rb').read()
SUB=struct.unpack_from('<I',clean,0x38)[0]

def ctf_records(path, res):
    d=open(path,'rb').read()
    count=struct.unpack_from('<I',d,0x18)[0]
    to=len(d)-count*72
    ents=[]
    for i in range(count):
        o=to+i*72
        name=d[o:o+64].split(b'\0')[0].decode('utf8')
        ents.append((name, struct.unpack_from('<II',d,o+64)))
    e=[x for x in ents if x[0].lower()==res.lower()]
    if not e: return None
    name,(start,size)=e[0]
    nxt=min([s for n,(s,_) in ents if s>start]+[len(d)])
    blob=d[start:nxt]; cur=0; out=[]
    for _ in range(size):
        off,sz=struct.unpack_from('<II',blob,cur); cur+=8
        out.append((off, blob[cur:cur+sz])); cur+=sz
    return out

def report(label, path, res='/vsh/module/paf.prx'):
    rr=ctf_records(path,res)
    print('===',label)
    if rr is None:
        print('  no such resource'); return
    for off,patch in rr:
        fo=off+SUB
        orig=clean[fo:fo+len(patch)]
        print('  rec off=0x%08x file=0x%06x patch=%s | 6.61orig=%s | %s'%(
            off, fo, patch.hex(), orig.hex(), 'CHANGES' if orig!=patch else 'redundant'))
        # show as float
        if len(orig)>=4:
            f=struct.unpack_from('<f',orig,0)[0]
            print('       orig as float %.6g' % f)

report('xbox 363.661 (repo)', os.path.join(BASE,'root_xbox_363.661.ctf'))
report('6.60 target (18 recs)', os.path.join(BASE,'psp_target_xbox_360.660.ctf'))
