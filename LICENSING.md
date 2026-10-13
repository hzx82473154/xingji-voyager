# 许可范围 / Licensing scope

本次源码交付为**原创程序代码采用 MIT、素材和数据分别授权**的组合。不要将“代码开源”写成“整个项目都是 MIT”或“整套内容可任意商用”。LICENSE、本文件和 NOTICE 应一同保留。

## MIT 适用范围

项目自行编写的程序逻辑、HTML/CSS 界面实现、着色器、构建及验证脚本，和项目自行编写的开发说明采用根目录 LICENSE 的 MIT 许可：

- src/ 中自行编写的程序和界面实现；下述嵌入的数据、素材和第三方声明除外。
- build.mjs、scripts/ 和 validation/ 中自行编写的代码，包括 schematic-generator.py。
- 根目录的项目开发及交付说明；第三方许可原文、署名、数据摘录不改为 MIT。
- 构建得到的程序中属于上述原创程序的部分。打包进同一 HTML 文件不会改变其他组件的许可。

MIT 允许别人复制、修改和商用这些代码，但须保留版权和许可声明。这不授予修改所有者原 GitHub 仓库或部署服务的权限，也不授予项目名称或第三方标志的商标许可。权利仅限于项目作者有权许可的部分；不对科学事实或 AI 输出作排他版权承诺。

版权署名目前使用项目名“星际 Voyager project author and contributors”，没有虚构个人姓名或邮箱；所有者以后可添加自己的真实署名。

## 数据与素材的独立授权

| 内容 | 适用许可或条件 | 详细记录 |
| --- | --- | --- |
| Three.js 0.180.0 / esbuild 0.25.11 | 各自 MIT，保留上游作者声明 | THIRD_PARTY_LICENSES.md |
| HYG / OpenNGC 数据及加工结果 | CC BY-SA 4.0 | catalogs/LICENSES.md、目录 manifest |
| 六组改编星座连线与成员数据，包括 src/exploration.js 的 CONSTELLATIONS 数据 | CC BY-SA 4.0；不改为 MIT | catalogs/LICENSES.md |
| Gaia DR3 自转数据 | CC BY-NC 3.0 IGO | catalogs/gaia-rotation-manifest.json |
| SIMBAD 提取数据库及相应加工结果 | ODbL 1.0 | catalogs/SIMBAD_BLACKHOLES.json、catalogs/LICENSES.md |
| van den Bosch 黑洞质量汇编 | 上游 MIT | catalogs/SMBH_LICENSE.txt |
| NASA/JPL、ESA、ESO、JAXA 的图片、观测模型和数据 | 按每项来源的许可及专项条件；含非商业限制 | assets/ASSET_LICENSES.md、assets/surfaces/LICENSES.md、逐文件登记 |
| 67P 科学网格 | CC BY-NC 3.0 IGO；照片另有许可 | assets/surfaces/sources.json |
| 全球底图、近景分块及 Natural Earth 地理边界 | 各自来源条件；Natural Earth 为公有领域 | catalogs/LICENSES.md、地理 manifest |
| 220 张景点照片 | 每张独立的 CC / 公有领域条件及额外限制标记 | assets/landmarks/LICENSES.md、catalogs/landmarks.json |
| Meanwhile 音乐 | Scott Buckley，CC BY 4.0 | catalogs/music.json |
| 修改命名后的界面字体 | OFL 1.1，保留完整 Adobe 声明和上游 Reserved Font Name 条款 | assets/FONT_LICENSE.txt |
| 项目新编景点/天体简介、三份数学示意网格 | 保留可主张的权利；事实与数学关系不因声明获得排他权。这些数据文件未改授 MIT | FULL_RIGHTS_REVIEW.md、逐文件登记 |

assets/、catalogs/、嵌入代码或 HTML 的数据/素材、第三方声明以及来源记录，不因目录位置或打包而改授 MIT。三份自行生成网格的生成程序采用 MIT，交付网格的数据声明保持原记录。

机器可查的逐文件来源、许可、作者、加工说明和哈希位于 validation/full-rights-evidence/rights-inventory.json；本次沿用已完成的 1277 份资源核查，没有重新做素材审计。CC BY-SA 或 ODbL 的再分发义务适用于对应组件；访问密码不撤销其已有许可权利。

完整组合版保留 Gaia 与 ESA 科学档案的非商业限制，不能凭代码 MIT 许可将整套应用用于广告、收费或客户商业项目。需要商用时应另整理符合该用途的数据和素材。

## 当前网站与历史交付

本轮整理当前源码交付的许可与发布文件，未修改在线网站。旧交付文件中的“原创程序无统一开源许可”反映当时状态；此源码交付中上列原创程序现按 MIT 授权，其他材料的原许可和限制继续有效。新的运行基线仅同步许可说明，场景、数据、布局和交互不变。

许可原文依据：[OSI MIT](https://opensource.org/license/mit)、[SPDX MIT](https://spdx.org/licenses/MIT.html)。GitHub 权限说明：[Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)。

## 最后核查补充 · 2026-10-13

已清除来源缓存中的完整网页、脚本和样式，只保留27条来源摘要、原响应哈希与必要数值事实。星座图案实际位于src/exploration.js的CONSTELLATIONS，明确保留CC BY-SA4.0；上游仓库、版本和具体改编差异记录在validation/full-rights-evidence/constellation-licence.json。未引入Stellarium程序源码或星座插画。

本项目的开放范围是MIT程序代码；第三方和原有非代码内容按各自声明提供。含非商业数据的完整素材组合不称为所有组件均符合OSI定义的开源软件，也不等同于可任意商用。遵守已许可引用条件、正确标注出处，与冒充他人的原创作品是不同的情形。当前核查没有识别出未处理的外部模板/源码引用，但不作全互联网代码查重或零法律争议认证。
