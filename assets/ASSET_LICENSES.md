# Asset sources and licenses / 素材来源与许可

## Required credit / 必须保留的署名

Planet textures by **Solar System Scope / INOVE**, licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/), based on NASA imagery and elevation data. [Original catalog](https://www.solarsystemscope.com/textures/).

Current Earth night lights: **NASA Earth Observatory / Joshua Stevens / Miguel Román**, Black Marble 2016. The active ocean mask is a downsampled **Solar System Scope / INOVE CC BY 4.0** derivative (`earth_specular_sss.jpg`). Night-light use follows [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). This project is an independent visualization and implies no endorsement.

行星纹理来自 Solar System Scope / INOVE，使用 CC BY 4.0 许可；当前地球夜景为 NASA Black Marble 2016；海洋反射遮罩已替换为来源明确的 Solar System Scope CC BY 4.0 衍生素材。请保留作者、来源、许可链接及以下修改记录。

## Inventory / 文件清单

| Local file | Source image / archive member | License | Dimensions |
| --- | --- | --- | --- |
| `earth_day.jpg` | `package/public/textures/earth.jpg` | CC BY 4.0 | 2048 × 1024 |
| `mercury.jpg` | `package/public/textures/mercury.jpg` | CC BY 4.0 | 2048 × 1024 |
| `venus.jpg` | `package/public/textures/venus.jpg` | CC BY 4.0 | 2048 × 1024 |
| `mars.jpg` | `package/public/textures/mars.jpg` | CC BY 4.0 | 2048 × 1024 |
| `jupiter.jpg` | `package/public/textures/jupiter.jpg` | CC BY 4.0 | 2048 × 1024 |
| `saturn.jpg` | `package/public/textures/saturn.jpg` | CC BY 4.0 | 2048 × 1024 |
| `uranus.jpg` | `package/public/textures/uranus.jpg` | CC BY 4.0 | 2048 × 1024 |
| `neptune.jpg` | `package/public/textures/neptune.jpg` | CC BY 4.0 | 2048 × 1024 |
| `sun.jpg` | `package/public/textures/sun.jpg` | CC BY 4.0 | 2048 × 1024 |
| `moon.jpg` | `package/public/textures/moon.jpg` | CC BY 4.0 | 2048 × 1024 |
| `earth_clouds.jpg` | `package/textures/8k_earth_clouds.jpg` | CC BY 4.0 | 2048 × 1024 |
| `venus_atmosphere.jpg` | `package/textures/4k_venus_atmosphere.jpg` | CC BY 4.0 | 2048 × 1024 |
| `saturn_ring.png` | `package/dist/img/saturn-rings.png` | CC BY 4.0 | 1024 × 64 |
| `earth_night.jpg` | NASA Black Marble 2016 current derivative, see sources.json | NASA Media Usage Guidelines | 2048 × 1024 |
| `earth_specular_sss.jpg` | downsampled `hi_earth_specular.jpg` / Solar System Scope | CC BY 4.0 | 2048 × 1024 |

## Retrieval and modifications / 获取及修改

Direct upstream downloads were unavailable in the build environment. Files were extracted from these public version-pinned npm distribution archives; their package code was not used:

- [gravityexp 0.2.0](https://registry.npmjs.org/gravityexp/-/gravityexp-0.2.0.tgz) — Sun, Earth day, Mercury, Venus surface, Mars, Jupiter, Saturn, Uranus, Neptune, Moon.
- [artastra 1.0.8](https://registry.npmjs.org/artastra/-/artastra-1.0.8.tgz) — Solar System Scope Earth clouds (8K) and Venus atmosphere (4K).
- [solaris-js 0.1.2](https://registry.npmjs.org/solaris-js/-/solaris-js-0.1.2.tgz) — Solar System Scope Saturn ring derivative, with transparency.
- Historical, retired original night/mask import: [earth-visualization 1.0.1](https://registry.npmjs.org/earth-visualization/-/earth-visualization-1.0.1.tgz) — NASA Earth night lights and ocean mask. Its README explicitly describes these as NASA public-domain imagery.

All output files are at most 2048 pixels wide. Color JPEG maps were recompressed at quality 88 (night/mask: 90); clouds and Venus atmosphere were reduced to 2048 × 1024. EXIF metadata was removed; map projection and geographic placement were preserved. The ring retains its 1024 × 64 RGBA packaged size and alpha; PNG was optimized.

每份素材的原始地址、下载地址、尺寸、修改、文件大小和 SHA-256 记录于 `sources.json`。重新分发时请同时保留本文件与 `sources.json`。

## Scientific fidelity / 科学精度

Solar System Scope states that its maps are based on NASA imagery/elevation, tuned against spacecraft/Hubble true-color photos. It also notes that colors are slightly saturated and unmapped gaps may be filled with matching fictional terrain. These textures are appropriate for a visual demonstration, not precision scientific analysis.

The retired Earth Visualization package import does not identify the original NASA catalog record or observation date for its night-light and specular maps. They are fixed demonstration composites, not live observations.

The Saturn ring texture is a radial strip: its horizontal coordinate should follow inner-to-outer radius; its vertical coordinate may be held constant or wrapped around the ring.

Retrieved and primary-source license checked: 7 October 2026.

## Transparent clouds and thumbnails / 云层及目的地缩略图

`earth_clouds.png` is an RGBA derivative of the Solar System Scope cloud map: white RGB with source luminance as alpha. This prevents an opaque cloud sphere from hiding Earth.

`thumb_sun.png`, `thumb_mercury.png`, `thumb_venus.png`, `thumb_earth.png`, `thumb_mars.png`, `thumb_jupiter.png`, `thumb_saturn.png`, `thumb_uranus.png`, `thumb_neptune.png`, and `thumb_moon.png` are rendered derivatives of the corresponding local Solar System Scope texture maps and remain CC BY 4.0. They use orthographic sphere projection, bilinear sampling, directional shading, transparent backgrounds, and 3× supersampling. Earth is centered on Asia; its thumbnail also uses the cloud map. Saturn uses the surface and transparent ring map. Thumbnail sizes are 120 × 120 except Saturn, which is 180 × 120.

These thumbnails are reproducible technical renders of the supplied maps, rather than generated photographs. The complete key-to-filename mapping is in `manifest.json`.

## Embedded UI font / 内嵌界面字体

Noto Sans SC Regular by the Noto Project Authors, SIL Open Font License 1.1. Source: https://github.com/notofonts/noto-cjk ; obtained from https://registry.npmjs.org/@expo-google-fonts/noto-sans-sc/-/noto-sans-sc-0.4.4.tgz . `voyager-ui-reviewed.woff` is a renamed subset of the original regular font containing this application’s interface characters, converted from TTF to WOFF. Internal family and PostScript names are now Voyager UI Review / VoyagerUIReview-Regular; glyph outlines remain unedited. The original Adobe copyright and OFL reserved-name notice are retained. Full license: `FONT_LICENSE.txt`. No runtime font network requests.


# High-resolution texture sources / 高分辨率纹理来源

Planet textures: **Solar System Scope / INOVE**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [official catalog](https://www.solarsystemscope.com/textures/). Based on NASA imagery/elevation with display color adjustments and fictional gap fill where mapping is incomplete. Retain this attribution and license link.

Night lights: **NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC.** [Official Black Marble flat maps](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/). Observation year: **2016**. [NASA media usage policy](https://www.nasa.gov/nasa-brand-center/images-and-media/). This is an independent visualization with no implied NASA endorsement.

| File | Actual dimensions | Source |
| --- | --- | --- |
| `earth_day_8k.jpg` | 8192 × 4096 | Solar System Scope |
| `earth_clouds_8k.jpg` | 8192 × 4096 | Solar System Scope |
| `earth_specular_8k.jpg` | 8192 × 4096 | Solar System Scope |
| `mercury_8k.jpg` | 8192 × 4096 | Solar System Scope |
| `mars_8k.jpg` | 8192 × 4096 | Solar System Scope |
| `venus_surface_8k.jpg` | 8192 × 4096 | Solar System Scope |
| `venus_atmosphere_4k.jpg` | 4096 × 2048 | Solar System Scope |
| `saturn_4k.jpg` | 4096 × 2048 | Solar System Scope |
| `jupiter_4k.jpg` | 4096 × 2048 | Solar System Scope |
| `sun_4k.jpg` | 4096 × 2048 | Solar System Scope |
| `moon_8k.jpg` | 8192 × 4096 | Solar System Scope |
| `uranus_2k.jpg` | 2048 × 1024 | Solar System Scope |
| `neptune_2k.jpg` | 2048 × 1024 | Solar System Scope |
| `earth_night_2016_gray_13500.jpg` | 13500 × 6750 | NASA Black Marble 2016 |
| `earth_night_2016_color_13500.jpg` | 13500 × 6750 | NASA Black Marble 2016 |
| `earth_night_2016_gray_16k.jpg` | 16384 × 8192 | NASA Black Marble 2016 |
| `earth_night_2016_gray_8k.jpg` | 8192 × 4096 | NASA Black Marble 2016 |

## Resolution and processing

Original SSS JPEG bytes were retained. Downloads came from the version-pinned `artastra@1.0.8` npm archive and the `smithcg1/DigitalSolarSystem` image mirror, because direct SSS downloads currently return a captcha. No mirror application code was copied or run. URLs, archive members, hashes, and actual dimensions are recorded in `sources.json`.

**Do not call Sun/Jupiter/Saturn 8K:** the upstream files named `8k_sun.jpg`, `8k_jupiter.jpg`, and `8k_saturn.jpg` actually decode to 4096 × 2048. Their local names explicitly say 4K. Uranus and Neptune remain original 2048 × 1024 sources. No 2K texture has been enlarged.

`earth_night_2016_gray_16k.jpg` is assembled from the eight NASA original 500 m 21600 × 21600 grayscale tiles, each reduced to 4096 × 4096 and tiled into 16384 × 8192. The 8K version is downsampled from this 16K composite; both are saved at JPEG quality 95. `night-tiles.json` contains every NASA URL and SHA-256. The processing script is `build-night-16k.py`. These files use genuine higher-resolution source detail, not an enlargement of the 3 km global map.

Use the **8K night map by default**; keep 16K optional to control offline-file size and GPU memory. The grayscale night map is an emission-intensity map: apply a warm emission color in the shader if desired. The original 13500-pixel NASA color/grayscale global maps are also retained as independent references.

Night lights are a fixed **2016 annual composite**, not current lighting or a scientifically calibrated radiance field. Planetary maps are multi-source composites without one documented observation year.

## Additional processed and observational assets

| File | Actual dimensions | Origin / processing |
| --- | --- | --- |
| `earth_clouds_alpha_4k.png` | 4096 × 2048 | Solar System Scope cloud map, white RGB / luminance alpha, true 8K source reduced to 4K |
| `m31_galex_pia15416_source.jpg` | 9400 × 7000 | NASA/JPL-Caltech GALEX PIA15416 |
| `m31_galex_2k.jpg` | 2048 × 1525 | NASA/JPL-Caltech GALEX PIA15416 |
| `m33_galex_pia03033_source.jpg` | 2904 × 2904 | NASA/JPL-Caltech GALEX PIA03033 |
| `m33_galex_2k.jpg` | 2048 × 2048 | NASA/JPL-Caltech GALEX PIA03033 |

M31: [Andromeda / PIA15416](https://www.jpl.nasa.gov/images/pia15416-andromeda/), published 2012-05-16. NASA GALEX far-ultraviolet (blue) / near-ultraviolet (orange) observational mosaic, not visible-light true color. Native source is 9400 × 7000.

M33: [Anatomy of a Triangulum / PIA03033](https://science.nasa.gov/photojournal/anatomy-of-a-triangulum/), Photojournal addition date 2005-10-13. NASA GALEX ultraviolet observation, native JPEG 2904 × 2904. Neither page gives one precise acquisition date; no observation year is invented.

Credit both galaxies **NASA/JPL-Caltech**. [JPL Image Use Policy](https://www.jpl.nasa.gov/jpl-image-use-policy/) permits these images with credit and no implied endorsement; retain the image credit. No logos, people, or third-party-only credited material is included.

Both 2K files are only Lanczos reductions of the official photographs, JPEG quality 94. No sky or stars were synthesized, composited, or recolored by this project. Black backgrounds are retained for rendering transparency/additive treatment; photographic foreground stars remain in the source.

`earth_clouds_alpha_4k.png` has white RGB and alpha equal to source cloud luminance. It is downsampled from the genuine 8K source, avoiding an opaque JPEG globe overlay.

## Pixel detail checks

`qa/detail-check.json` records real decoded dimensions and native-versus-2K-resampled RMS residuals for nine key maps. This is a reproducible image-detail check, not a guarantee of native spacecraft sensor resolution. Native-scale crops in `qa/` were visually inspected: East Asian coasts and terrain, city-light road structures, and lunar crater detail are distinct.

## 1.9 球面地貌与真实地标

- 地表分块：NASA GIBS `BlueMarble_ShadedRelief_Bathymetry`，EPSG:4326、500m矩阵。历史自然色合成包含MODIS地表、地形和GEBCO海底阴影，不是实时卫星影像或建筑三维测绘。来源与逐图SHA256见 catalogs/surface-manifest.json、surface-tiles.json。源码生成器 scripts/import-surface-tiles.py 下载并保存原JPEG，无运行时地图服务或API密钥。
- 地标实景：48张，逐图作者、原页、许可与加工说明见 assets/landmarks/LICENSES.md、credits.json；全部内嵌，未使用生成式图片。
- 地标介绍：根据 catalog 中记录的UNESCO及景点官方来源原创中文短介；定位为地图浏览代表点，不是测绘精度。

## 2.0 全球自然色底图、150处地标与音乐

全球底图由50张NASA GIBS同源z3影像拼合，再以Lanczos缩小至4096×2048，JPEG92；无人工重新着色。详情、源URL和逐瓦片哈希见catalogs/globe-relief.json。823张近景分块约29.24MiB，覆盖全部150处景点的周边。

150张地标照片（中国50、海外100）按图保留原作者、来源和许可，见landmarks/LICENSES.md和credits.json；新增102张均为真实对应地点的照片，未使用生成图片。缩放/压缩为WebP，不改变画面内容。

音乐：**'Meanwhile' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au**

- 原作者页面：https://www.scottbuckley.com.au/library/meanwhile/
- 原曲下载：https://www.scottbuckley.com.au/library/wp-content/uploads/2025/01/Meanwhile.mp3
- 许可：https://creativecommons.org/licenses/by/4.0/
- 修改：仅转为160kbps立体声MP3以减小离线文件；作品内容、时长保持。原始和处理后哈希、参数见catalogs/music.json。保留此署名、许可链接及修改说明；音乐许可不适用于项目代码。

## 2.1 精细连续底图与220处地标

`geography/global-relief-fine.jpg`为8192×4096，`geography/global-relief-fine-mobile.jpg`为4096×2048。二者由完整的800张NASA GIBS真实level5 EPSG:4326分块拼成20480×10240源图后分别直接降采样；JPEG94、4:4:4色度，没有内容重绘或AI扩图。手机版不在客户端解码桌面8K或16K影像。完整来源、哈希、字节和处理信息见catalogs/fine-globe-relief.json。致谢NASA Earth Observatory / MODIS / GEBCO，适用NASA媒体使用政策：https://www.nasa.gov/nasa-brand-center/images-and-media/ 。影像为历史2004自然色地貌与海底阴影合成，并非实时图像；没有NASA背书。

详细区域缓存现为931张、约32.17MiB，覆盖220处景点周边；每张原始JPEG的来源格网、边界和哈希见catalogs/surface-tiles.json，覆盖与许可见surface-manifest.json。标准模式保留连续低分底图，精细模式按视角加载有限分块；照片和底图许可不适用于项目代码。

220张地标照片：中国70、海外150。原150张保留，新增70张独立真实照片；均只缩放与WebP压缩，没有改变内容。逐图作者、原页、许可链接和修改说明见landmarks/LICENSES.md与credits.json，介绍面板也提供署名与链接。

## 2026-10-11 active-resource correction

`earth_specular.jpg` has unresolved original-image provenance and is retired. Do not include it in current distributable resource banks. `earth_specular_sss.jpg` derives from the recorded SSS high-resolution map, downsampled to 2048×1024 and JPEG recompressed, CC BY 4.0. Old rollback snapshots and Git history retain historical bytes and require separate cleanup before publishing a complete source archive. The disputed `landmarks/cn-potala.webp` is similarly retired in favour of `landmarks/cn-potala-licensed.webp` by Yi ZHANG, CC BY-SA 4.0.
