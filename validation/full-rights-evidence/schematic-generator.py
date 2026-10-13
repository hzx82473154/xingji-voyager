# Original mathematical schematic generator. No imported observational mesh coordinates.
# All lengths are kilometres; output vertices are normalized by x extent.
import math,json,pathlib,hashlib
PARTS={"lutetia":[((0,0,0),(60.5,50.5,37.5))],"steins":[((0,0,0),(2.58,2.58,2.58))],"arrokoth":[((-6.5,0,0),(11,10,5)),((11,0,0),(6.5,7,3.5))]}
def generate(parts,radiusKm):
 positions=[];indices=[];scale=radiusKm;lat=24;lon=48
 for c,a in parts:
  start=len(positions)//3
  for v in range(lat+1):
   theta=math.pi*v/lat
   for u in range(lon+1):
    phi=2*math.pi*u/lon
    positions.extend(round(x/scale,7) for x in [c[0]+a[0]*math.sin(theta)*math.cos(phi),c[1]+a[1]*math.cos(theta),c[2]+a[2]*math.sin(theta)*math.sin(phi)])
  for v in range(lat):
   for u in range(lon):
    p=start+v*(lon+1)+u;indices.extend([p,p+1,p+lon+1,p+1,p+lon+2,p+lon+1])
 return positions,indices
if __name__=="__main__":
 root=pathlib.Path(__file__).resolve().parents[2]
 for key,parts in PARTS.items():
  existing=json.loads((root/"assets/surfaces"/(key+"-schematic-shape-v2.json")).read_text());positions,indices=generate(parts,existing["normalizationRadiusKm"])
  assert positions==existing["positions"] and indices==existing["indices"],key
 print("Three original mathematical schematics reproduce exactly; no observed surface claim.")
