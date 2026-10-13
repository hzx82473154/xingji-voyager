#!/usr/bin/env python3
"""Validate imported source coverage and physical catalog semantics without a browser."""
import gzip, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
b=json.loads((ROOT/'catalogs/blackholes.json').read_text())
e=json.loads(gzip.decompress((ROOT/'catalogs/belt-members.json.gz').read_bytes()))
objects=b['objects'];rows=e['rows'];byid={o['id']:o for o in objects}
assert len(objects)==b['counts']['total']==len(byid)
assert len(rows)==e['counts']['total']==len(set(r[0] for r in rows))
assert all(len(r)==len(e['columns']) for r in rows)
assert sum(o['id'].startswith('blackcat-') for o in objects)==b['counts']['simbadTargets']==73
assert sum(1+len(o.get('alternativeMeasurements',[])) for o in objects if o['id'].startswith('smbh-'))==b['counts']['massCompilationSourceRows']==294
assert sum(o['status']=='confirmed' for o in objects)==b['counts']['confirmed']
assert sum(o['status']=='candidate' for o in objects)==b['counts']['candidates']
assert all(o['massSolar'] is None for o in objects if o.get('massConstraint')=='upper-limit')
assert all(o['status']=='candidate' for o in objects if o.get('massConstraint')=='upper-limit')
assert all(o['rotationPeriodDays'] is None for o in objects)
assert all(o['raDeg'] is None or 0<=o['raDeg']<=360 for o in objects)
assert all(o['decDeg'] is None or -90<=o['decDeg']<=90 for o in objects)
assert all(o['massSolar'] is None or o['massSolar']>0 for o in objects)
assert all(o['distancePc'] is None or o['distancePc']>0 for o in objects)
assert all(r[5]>0 and 0<=r[6]<1 and r[11]>0 for r in rows)
assert all(r[12] is None or r[12]>0 for r in rows)
assert all(r[13] is None or r[13]>0 for r in rows)
assert all(r[14] is None or r[14]>0 for r in rows)
# The retired table estimate is not silently reintroduced; unsupported replacement mass remains null.
assert next(o for o in objects if o['name']=='GRS 1915+105')['massSolar'] is None
# Author upper limits use logMBH+DMBH, as in the source author's plot code.
assert next(o for o in objects if o.get('host')=='NGC0598')['massUpperLimitSolar']>1000
assert byid['gaia-bh3']['orbitalPeriodDays']==4253.1
assert byid['ton-618']['distancePc'] is None and byid['ton-618']['redshift']==2.219
assert byid['cygnus-x1']['massSolar']==21.2
print('PASS: complete source rows; unique IDs; positions/physical ranges; measured vs upper-limit semantics; missing spin remains unknown; alternative measurements retained')
print(json.dumps({'blackholes':b['counts'],'belts':e['counts']},ensure_ascii=False))
