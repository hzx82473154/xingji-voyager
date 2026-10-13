# Catalog data licenses and attribution

The HYG-derived portion and OpenNGC-derived portion of `catalog.json.gz`, including coordinate/field transformations, are distributed under Creative Commons Attribution-ShareAlike 4.0 International: https://creativecommons.org/licenses/by-sa/4.0/ . This applies to the dataset, separately from the application code and images.

HYG Database v4.1 — David Nash / Astronomy Nexus. Source: https://github.com/astronexus/HYG-Database ; current project https://codeberg.org/astronexus/hyg . Based on Hipparcos, Yale Bright Star and Gliese catalogs. Removed duplicate Sol record, retained identifiers, names, J2000 RA/Dec, distance, magnitude, spectral type and colour index. Distances converted from parsecs to light-years; missing/unreliable distance sentinel is represented by null. Source response hash, retrieval date and transformations documented in manifest and refresh script.

OpenNGC — Mattia Verga, https://github.com/mattiaverga/OpenNGC . Sources acknowledged by the project include NASA/IPAC Extragalactic Database, HyperLEDA, SIMBAD, HEASARC and Harold Corwin's NGC/IC positions. Selected G/GPair/GTrpl/GGroup rows and retained catalog names, RA/Dec, redshift, angular axes, morphology and position angle. Source field meanings: https://github.com/mattiaverga/OpenNGC/blob/master/NGC_guide.txt . README/license evidence: https://github.com/mattiaverga/OpenNGC/blob/master/README.md . Estimated redshift distances are application calculations and explicitly labelled.

NASA Exoplanet Archive — PS table with default_flag=1, one default reference solution per confirmed exoplanet. Planet properties are not interpolated from the Composite table. Missing system coordinates/distances are independently supplemented from PSCompPars and attributed in the UI; no other Composite planet parameters are used. This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program. Source/table definitions and acknowledgment: https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html and https://exoplanetarchive.ipac.caltech.edu/docs/acknowledge.html . Missing values are retained, not zero-filled.

These snapshots are incomplete relative to the full observable sky. No warranty of scientific accuracy is implied. Measurement epochs, selection effects, measurement errors and model assumptions limit physical interpretation.

Sky-pattern view: J2000 directions derive from HYG, CC BY-SA 4.0. Six simplified line patterns are an adaptation by Voyager, re-verified against Stellarium team's Modern skyculture (text/data CC BY-SA 4.0): https://github.com/Stellarium/stellarium/blob/d4a1322b6a81bf15dc4ef65c267b2fc846c5f3ca/skycultures/modern/index.json ; licence https://github.com/Stellarium/stellarium/blob/d4a1322b6a81bf15dc4ef65c267b2fc846c5f3ca/skycultures/modern/description.md . Exact checked source version, licence hash and per-pattern adaptation differences: validation/full-rights-evidence/constellation-licence.json. Most connections are a subset of Modern; Orion's simplified shoulder connection is a Voyager variation. The earlier Western reference did not state a licence version and is not evidence for CC BY-SA 4.0. No illustrations or Stellarium application code are imported. Modified connecting arcs remain CC BY-SA 4.0; they are not physical connections or IAU boundaries.


Voyager 1.6 satellite and cluster additions (retrieved 2026-10-07):
- JPL SSD mean satellite elements https://ssd.jpl.nasa.gov/sats/elem/ and physical radii https://ssd.jpl.nasa.gov/sats/phys_par/ . Twenty main-satellite rows are transcribed as numerical facts in src/moons.js. Mean fixed ellipses are used only for demonstration; JPL warns that these elements are not precision ephemerides. Display phase, distance compression and surface illustrations are application choices.
- Pleiades mean distance (~445 ly): https://www.jpl.nasa.gov/news/kepler-watches-stellar-dancers-in-the-pleiades-cluster/ . Centre direction follows HYG HIP17702 (Alcyone); 20 ly display radius is a schematic extent, not a claimed measured boundary.
- Omega Centauri approximate distance (~16000 ly): https://www.jpl.nasa.gov/images/pia13125-omega-centauri/ ; ~150 ly illustrated diameter: https://science.nasa.gov/image-article/apod-2025-july-26-globular-cluster-omega-centauri/ . Centre coordinates rounded from SIMBAD J2000 13:26:47.28 -47:28:46.1: https://simbad.cds.unistra.fr/simbad/sim-id?Ident=NGC5139 . Literature distance and extent estimates vary.
- New constellation 3D positions derive from the same HYG data and retain CC BY-SA4.0 attribution. Galactic/cluster internal particles, globe surfaces and simplified host-system layouts are original program-generated illustrations, not observed imagery or newly measured stars. Existing NASA/GALEX photos are retained for navigation thumbnails only; selected external-galaxy models use no photo sprite.


Voyager 1.7 country geometry (retrieved 2026-10-07):
- Natural Earth Admin 0 Countries, 1:50M. Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson . All Natural Earth vector data are public domain: https://www.naturalearthdata.com/about/terms-of-use/ . Country/region names, continent, subregion, label points, and every polygon ring retained; coordinates rounded to five decimal places. Source default de facto depiction and topology retained. Seven common Chinese display names normalized. No sovereignty remapping, administrative subdivision data or population statistics added. See countries-manifest.json for raw/processed hashes and exact transformations. Natural Earth data are separate from the CC BY-SA astronomical catalog.
- China's original short geography paraphrase references China Geological Survey: https://en.cgs.gov.cn/Facts/201603/t20160309_266151.html and Ministry of Commerce geography: https://us.mofcom.gov.cn/AboutChina/art/2020/art_94836791fc4448cf9f0221c1bd054314.html . No article text copied. Other short descriptions are generated from the retained region and spherical geometry, without current statistical claims.

## 1.9 展示层与地理探索

Natural Earth原始快照保持不变。运行时将TWN、HKG、MAC作为CHN的地区记录，分别显示中国台湾、中国香港、中国澳门，地区轮廓保留用于命中拾取，CHN高亮轮廓合并上述区域的原始多边形。菜单地区置于“中国 · 地区”组，不在国家组并列。此处理只调整展示归属，不提升源数据边界精度。

地表来源与离线覆盖见surface-manifest.json，地标图文来源见landmarks.json。细节分辨率因区域、缩放层级及设备而不同；未覆盖部分保留原地球地表，未用缩放旧图冒充新数据。

## 2.0 地球与地标数据

全球底图和近景分块均采用同一NASA BlueMarble_ShadedRelief_Bathymetry历史影像源；全球底图和823张详细分块记录在globe-relief.json、surface-tiles.json。全球底图补足未缓存的近景区域，未将旧图放大宣称新测绘数据。landmarks.json包含150处来源明确的景点及对应照片许可；100处海外景点提供英文名称。中国台湾、香港、澳门的展示归属沿用1.9实现。背景音乐来源/许可/哈希见music.json。

## 2.1 大洲、连续底图和220处地标

大洲浏览沿用Natural Earth快照，合并同洲多边形并隐藏内部国界；欧亚跨洲地区按简化地理线分组，乌拉尔经线和土耳其海峡仅为浏览近似，不是新的测绘或行政划界。国家/地区原始索引继续用于来源和地标归属。

精细全球底图由NASA GIBS EPSG:4326 500m矩阵level5的800张真实源分块，拼成20480×10240后分别直接降采样为8192×4096桌面版和4096×2048手机版，没有AI扩图。来源、完整瓦片列表与SHA256、加工过程、时期及像素尺寸详见fine-globe-relief.json。致谢NASA Earth Observatory / MODIS / GEBCO；历史2004自然色地形与海底阴影，不是实时遥感或街道影像。标准底图沿用globe-relief.json；新增景点周边详细覆盖见当前surface-tiles.json与surface-manifest.json。

landmarks.json现为220处：中国70、海外150；全部保留原150处并增加70处，海外记录均有英文名。来源明确的原创短介与每张照片的作者、原页及独立许可均在记录中。全部照片只缩放与WebP压缩，内容未改变；完整照片许可见assets/landmarks/LICENSES.md和credits.json。中国台湾、香港、澳门展示归属不变。


## Voyager 2.2 catalogs and rings

Gaia DR3: ESA data license CC BY-NC 3.0 IGO. This is separate from HYG/OpenNGC share-alike data and is not a blanket commercial-use grant. Full ESA/DPAC acknowledgement, release DOI, parameter provenance, query and raw/processed SHA-256 are retained in gaia-rotation-manifest.json. The Gaia DR3 vari_rotation_modulation fixed release has 474,026 rows; model radii/temperatures/distances are not direct resolved surface observations. ESA license source: https://esdcdoi.esac.esa.int/doi/html/data/astronomy/gaia/DR3.html .

This work has made use of data from the European Space Agency (ESA) mission Gaia (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing and Analysis Consortium (DPAC, https://www.cosmos.esa.int/web/gaia/dpac/consortium). Funding for the DPAC has been provided by national institutions, in particular the institutions participating in the Gaia Multilateral Agreement.

SIMBAD replacement targets, van den Bosch mass compilation and supplement citations/permissions are retained in BLACKHOLES_BELTS.md, SMBH_LICENSE.txt and blackholes-manifest.json. Numerical facts and null values are transcribed; source paper text and images are not copied. JPL SBDB member data and query/hash evidence are in belt-members-manifest.json; these are approximate two-body illustrations, not ephemerides. NASA Exoplanet Archive PS default solutions also retain st_rotp and gaia_dr3_id; host identities are merged only by exact IDs.

Additional OpenNGC star-cluster/nebula rows and derived coordinates retain Mattia Verga's CC BY-SA 4.0 attribution; deep-sky.json has source/hash and missing-distance nulls. Native ring radial bands derive from NASA PDS Ring-Moon Systems Node tables in rings.json; material opacity and minimum display width are visualization choices.

Mission textures, photographs and observed meshes have individual source, transformation and credit records in assets/surfaces/LICENSES.md and sources.json. NASA media guidelines apply to NASA images; 67P ESA mesh/photo derivatives require their documented CC BY-SA 3.0 IGO attribution/share-alike terms. These licenses are independent of original application code and individual Earth landmark photos. No uniform rights claim is made over the assembled third-party material.

## SIMBAD component licence

SIMBAD — CDS, Strasbourg, https://simbad.astro.unistra.fr/simbad/ ; ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/ . Separate extracted crossmatch fields are provided in SIMBAD_COORDINATES.json; transformations and representative Omega Centauri centre included. Data-component notice and share-alike terms do not relicense application code or unrelated database components.

Former BlackCAT full-snapshot parameters have been retired from current data. Independent SIMBAD target extraction and transformations are provided in SIMBAD_BLACKHOLES.json under ODbL1.0. See BLACKHOLES_BELTS.md and NONCOMMERCIAL_SHARING.md; this project is not cleared for unrestricted commercial use.
