#!/usr/bin/env python3
"""Refresh independently licensed SIMBAD fields; do not revive former source tables.
Review changes then prepare new platform snapshots; this does not alter deployed UI.
Use --cached-response-dir validation/noncommercial-evidence to reproduce this edition.
"""
import argparse,hashlib,json,pathlib,urllib.request,urllib.parse,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
def write(p,x):(ROOT/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
ap=argparse.ArgumentParser();ap.add_argument('--cached-response-dir',type=pathlib.Path);args=ap.parse_args()
component=read('catalogs/SIMBAD_BLACKHOLES.json');source=component['source'];responses={};tables={}
for name,query in source['queries'].items():
 raw=(args.cached_response_dir/(name+'.json')).read_bytes() if args.cached_response_dir else urllib.request.urlopen('https://simbad.cds.unistra.fr/simbad/sim-tap/sync?'+urllib.parse.urlencode({'request':'doQuery','lang':'adql','format':'json','query':query}),timeout=60).read()
 data=json.loads(raw);columns=[x['name'] for x in data['metadata']];tables[name]=[dict(zip(columns,r)) for r in data['data']];responses[name]=hashlib.sha256(raw).hexdigest()
matches={r['main_id']:r for r in tables['bh-crossmatch']};types={r['oidref']:r['otypes'] for r in tables['bh-alltypes']}
assert len(matches)==73,'Unexpected identifier matches; review before replacing data'
for r in component['records']:
 m=matches[r['rawParameters']['simbadMainId']];d=sorted([x for x in tables['bh-distances'] if x['oidref']==m['oid']],key=lambda x:(x['bibcode'] or '',x['mespos']),reverse=True)
 x=d[0] if d else None;scale={'pc':1,'kpc':1000,'Mpc':1000000};r['raDeg']=m['ra'];r['decDeg']=m['dec'];r['distancePc']=x['dist']*scale[x['unit'].strip()] if x and x['unit'].strip() in scale else None
 r['status']='confirmed' if 'BH' in types[m['oid']].split('|') else 'candidate';r['confirmationMethod']='SIMBAD BH classification' if r['status']=='confirmed' else 'candidate/research target; SIMBAD classification does not establish dynamical confirmation'
 r['rawParameters'].update({'simbadObjectType':m['otype'],'simbadAllTypes':types[m['oid']],'coordinateBibcode':m['coo_bibcode'],'distanceMeasurements':d})
 r['parameterMethods']['distance']='most recent available SIMBAD literature-distance measurement, not parallax inversion' if d else 'not independently verified in replacement component'
 assert r['massSolar'] is None and r['orbitalPeriodDays'] is None and r['rotationPeriodDays'] is None
source['responseSha256']=responses;source['retrievedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
b=read('catalogs/blackholes.json');byid={r['id']:r for r in component['records']};b['objects']=[byid.get(r['id'],r) for r in b['objects']];b['sources']=[source if s['id']==source['id'] else s for s in b['sources']]
b['counts'].update({'confirmed':sum(r['status']=='confirmed' for r in b['objects']),'candidates':sum(r['status']=='candidate' for r in b['objects']),'withDistance':sum(r.get('distancePc') is not None for r in b['objects']),'withPosition':sum(r.get('raDeg') is not None and r.get('decDeg') is not None for r in b['objects'])});b['generatedAt']=source['retrievedAt'];m=read('catalogs/blackholes-manifest.json');m.update({'sources':b['sources'],'counts':b['counts'],'generatedAt':b['generatedAt']})
write('catalogs/SIMBAD_BLACKHOLES.json',component);write('catalogs/blackholes.json',b);write('catalogs/blackholes-manifest.json',m);print('SIMBAD target fields refreshed; review differences before freezing/publishing snapshots.')
