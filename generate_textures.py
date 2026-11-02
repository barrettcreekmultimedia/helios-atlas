"""Generate original, stylized equirectangular planetary surface maps.
Requires Pillow and NumPy. Pre-generated PNGs are already included in assets/.
These are artistic textures, not cartographically accurate surface imagery.
"""
from PIL import Image,ImageDraw,ImageFilter
import numpy as np, math, os
OUT=os.path.join(os.path.dirname(__file__),'assets')
os.makedirs(OUT,exist_ok=True)
W,H=1024,512
rng=np.random.default_rng(4831)
y,x=np.mgrid[:H,:W]
lat=(y/H-.5)*np.pi

def noise(scale=8, seed=0):
    rg=np.random.default_rng(1101+seed)
    nw=max(3,int(scale*2));nh=max(3,int(scale))
    a=rg.random((nh,nw)).astype(np.float32)
    # Periodic horizontal repeats, with enough detail to camouflage seam
    tile=np.concatenate([a,a[:,:1]],axis=1)
    im=Image.fromarray(np.uint8(tile*255)).resize((W+int(W/nw),H),Image.Resampling.BICUBIC)
    return np.asarray(im.convert('L').resize((W,H),Image.Resampling.BICUBIC),dtype=np.float32)/255

def fbm(seed=0):
    return (.52*noise(4,seed)+.26*noise(11,seed+10)+.14*noise(31,seed+20)+.08*noise(82,seed+30))

def draw(name,arr,craters=0):
    arr=np.clip(arr,0,255).astype('uint8')
    im=Image.fromarray(arr,'RGB')
    if craters:
        c=Image.new('RGBA',(W,H))
        d=ImageDraw.Draw(c,'RGBA')
        rgen=np.random.default_rng(craters*90+41)
        for i in range(craters):
            px=int(rgen.uniform(0,W));py=int(rgen.uniform(0,H)); r=int(rgen.uniform(3,22))
            d.ellipse((px-r,py-r,px+r,py+r),fill=(25,23,25,22),outline=(245,239,226,46),width=2)
            d.ellipse((px-r*.64,py-r*.64,px+r*.64,py+r*.64),outline=(8,8,10,21),width=1)
        im=Image.alpha_composite(im.convert('RGBA'),c).convert('RGB')
    im.save(os.path.join(OUT,f'{name}.jpg'),quality=87,optimize=True)

# utility color interpolation for layered rocky terrain
def terrain(stops,v):
    out=np.zeros((H,W,3),dtype=np.float32)
    for i in range(3):
        out[:,:,i]=np.interp(v, [c[0] for c in stops], [c[1][i] for c in stops])
    return out

n=fbm(1);m=fbm(10)
# Sun: fiery mottled plasma
p=(n-.5)*1.2 + .25*np.sin(x*.055 + 12*m) + .12*np.cos(y*.1)
draw('sun',terrain([(0,(132,39,9)),(.36,(236,95,15)),(.60,(255,169,31)),(1,(255,230,105))],np.clip(.58+p*.54,0,1)))
# Mercury
p=fbm(5)*.78+noise(80,2)*.22
draw('mercury',terrain([(0,(60,62,68)),(.32,(113,108,108)),(.65,(161,152,141)),(1,(205,190,173))],p),105)
# Venus cloud bands
p=fbm(9)*.67+.18*np.sin(y*.06+fbm(12)*18)+.12*noise(24,10)
draw('venus',terrain([(0,(111,81,49)),(.30,(182,136,87)),(.50,(217,184,136)),(.74,(245,224,176)),(1,(253,238,207))],p))
# Earth: land mass stylization with deep ocean & ice caps
land=fbm(30)*.6+noise(5,25)*.4+ .08*np.sin(x*.035+np.sin(y*.02)*4)
water=terrain([(0,(5,21,53)),(.37,(10,50,91)),(.69,(22,100,145)),(1,(47,133,155))],fbm(34))
landcol=terrain([(0,(31,67,49)),(.33,(57,106,62)),(.55,(118,131,75)),(.75,(148,130,89)),(1,(231,211,166))],fbm(27))
mask=(land>.51)[...,None]
arr=np.where(mask,landcol,water)
cloud=noise(17,45)*.55+noise(52,46)*.45
alpha=np.clip((cloud-.60)*1.2,0,.37)[...,None]
arr=arr*(1-alpha)+np.array([245,248,248])*alpha
ice=np.clip((np.abs(lat)-1.22)*3,0,1)[...,None]
arr=arr*(1-ice)+np.array([232,237,231])*ice
draw('earth',arr)
# Moon
p=fbm(59)*.8+noise(29,3)*.2
draw('moon',terrain([(0,(47,48,54)),(.35,(93,94,102)),(.65,(142,140,142)),(1,(208,204,200))],p),90)
# Mars with polar caps
p=fbm(67)*.82+noise(18,28)*.18
arr=terrain([(0,(81,37,24)),(.30,(143,63,41)),(.58,(192,100,65)),(.8,(210,136,93)),(1,(239,183,136))],p)
mask=np.clip((np.abs(lat)-1.35)*5,0,1)[...,None]
arr=arr*(1-mask)+np.array([220,212,204])*mask
draw('mars',arr,24)
# Jupiter atmospheric stripes + Great Red Spot
p=fbm(73); bands=np.sin(y*.072 + p*4)+.52*np.sin(y*.172+noise(12,10)*5)+.18*np.sin(y*.5)
v=np.clip(.5+bands*.18+(p-.5)*.22,0,1)
arr=terrain([(0,(108,72,64)),(.20,(170,110,85)),(.43,(209,171,135)),(.61,(235,209,165)),(.8,(188,148,126)),(1,(250,230,202))],v)
# Large reddish storm oval
cx,cy=710,325
rr=((x-cx)/(91+np.sin(y*.1)*3))**2+((y-cy)/27)**2
storm=np.clip((1-rr)*3,0,1)[...,None]
arr=arr*(1-storm*.85)+np.array([190,97,65])*storm*.85
draw('jupiter',arr)
# Saturn
p=fbm(83);bands=np.sin(y*.102+p*3)+.28*np.sin(y*.24+p*9)
v=np.clip(.57+bands*.14+(p-.5)*.28,0,1)
draw('saturn',terrain([(0,(110,94,68)),(.3,(166,143,104)),(.5,(205,183,133)),(.7,(230,210,165)),(1,(244,228,197))],v))
# Uranus / Neptune
p=fbm(102)
draw('uranus',terrain([(0,(77,144,154)),(.28,(121,189,195)),(.56,(153,219,216)),(1,(180,233,230))],np.clip(.48+.19*np.sin(y*.025+p*4)+.3*(p-.5),0,1)))
p=fbm(112)
draw('neptune',terrain([(0,(8,31,99)),(.3,(13,61,161)),(.58,(37,100,208)),(1,(87,151,225))],np.clip(.48+.2*np.sin(y*.043+p*6)+.31*(p-.5),0,1)))
# Ceres, Pluto, Haumea, Makemake, Eris
for name,seed,stops,cr in [
 ('ceres',117,[(0,(55,54,55)),(.5,(119,110,103)),(1,(177,167,158))],100),
 ('pluto',127,[(0,(74,58,51)),(.32,(136,99,82)),(.62,(217,186,161)),(1,(246,232,207))],48),
 ('haumea',137,[(0,(104,100,97)),(.4,(174,166,153)),(1,(233,225,210))],25),
 ('makemake',147,[(0,(87,56,47)),(.5,(157,111,89)),(1,(215,170,135))],32),
 ('eris',157,[(0,(107,111,119)),(.5,(184,187,194)),(1,(237,235,234))],35),
 ('titan',167,[(0,(104,60,23)),(.5,(188,127,56)),(1,(225,180,108))],0),
 ('europa',177,[(0,(93,78,62)),(.5,(191,175,148)),(1,(233,221,198))],8),
 ('io',187,[(0,(140,87,32)),(.5,(231,189,62)),(1,(246,228,141))],28),
 ('ganymede',197,[(0,(54,57,66)),(.5,(115,108,96)),(1,(181,164,140))],45),
 ('callisto',207,[(0,(35,34,36)),(.5,(86,82,79)),(1,(143,137,132))],72),
 ('enceladus',217,[(0,(112,139,151)),(.5,(193,212,220)),(1,(239,246,249))],15),
 ('triton',227,[(0,(73,74,85)),(.5,(156,148,143)),(1,(220,205,189))],15)]:
    draw(name,terrain(stops,fbm(seed)*.8+noise(36,seed)*.2),cr)
print('Generated',len(os.listdir(OUT)),'planet texture files')
