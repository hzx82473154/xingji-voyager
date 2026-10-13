# 星际 Voyager · 3D Universe Explorer

在浏览器里探索太阳系、恒星、星系与地球地貌的三维项目。支持电脑与手机各自的界面、离线浏览、天体检索、地球大洲和地标探索，以及带署名的背景音乐。

当前应用基线：电脑 **2.9.5**、手机 **2.9.5**。2026-10-13完成最终发布核查，修正网页缓存、星座出处与模型元数据。在线网站没有更新，保留已经确认的素材许可。

220 个景点（中国 70、海外 150）、79 个表面资料目录对象、369 个黑洞或候选研究目标；另有 HYG、Gaia、系外行星和深空目录。各目录可能交叉，并非全部已知天体。实测资料与程序示意在说明中区分，不能当作精密星历。

**原创程序代码采用 MIT；数据、图片、音乐、字体保留各自许可。完整组合版含非商业限制。** 请先看 [许可范围](LICENSING.md)、[NOTICE](NOTICE) 和 [非商业分享说明](NONCOMMERCIAL_SHARING.md)，不要将整套项目标成“所有素材 MIT / 可任意商用”。

## 安装与构建

需要 Node.js 20 或以上、npm、Python 3；首次安装依赖需要联网。

```sh
npm ci
npm run check
npm run test:release
python scripts/build-with-password.py
```

最后一条命令隐藏输入自己设定的 6–256 字符访问密码，顺序构建并验证两端在线/离线包；成功后生成 dist/ 和在线入口 index.html。原网站的真实密码没有包含在源码里。不要把访问口令、私钥、服务令牌或私人配置提交到仓库。

生成的 dist/ 是应用部署包，包含在线资源和离线入口。入口密码属于前端加密访问门槛，不能替代服务器身份认证或防复制机制。公开源码可以被下载；公开后请使用独立于其他账户的项目密码。

## 文件与平台维护

| 路径 | 内容 |
| --- | --- |
| src/ | 可编辑程序与界面源文件 |
| assets/、catalogs/ | 当前完整素材和目录，保留各自许可 |
| platform-runtimes.json | 两端当前构建基线和独立更新开关 |
| desktop-v295-delivery/、mobile-v295-delivery/ | 当前两端完整基线；本次仅同步许可文字 |
| runtime-resources.json | 当前运行资源清单，不依赖旧版本 |
| scripts/、validation/ | 构建、数据和安全验证 |
| source-sha256.json | 此源码包全部交付文件的 SHA-256 清单 |

当前两端从各自冻结基线构建。以后修改 src/ 时，将获准更新的一端 mode 改为 source 并填写新版 version，另一端保持 frozen；scripts/runtime-snapshot.mjs 可生成新基线。电脑与手机继续分开维护，只有明确要求时一起更新。

此包只保留当前必要文件，没有旧回滚、旧素材、原始 Git 历史、真实密码或私人托管配置。新增素材或刷新科学数据时需核查其来源和许可。

## 验证与发布

自动验证涵盖语法、构建、两端在线/离线密码入口和资源完整性；不替代真实电脑 GPU、实体手机操作、音乐试听或帧率测试。测试和未完成事项见 [本次检查记录](RELEASE_CHECK.md)。GitHub 私有仓库上传步骤、作品简介和真机检查表见 [发布准备](GITHUB_PREPARE.md)。本次尚未上传 GitHub，也没有将仓库公开。

MIT 允许别人使用、复制和修改自己的代码副本，须保留声明。未授予他们直接编辑你原仓库的权限；贡献者可以提交建议或 pull request，由所有者决定是否合并。

## 致谢

在线演示：[星际 Voyager](https://xingji-voyager.copper-crab-0934.chatgpt.site)。访问密码由所有者单独提供。

音乐：'Meanwhile' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au

逐项署名与许可见 NOTICE、THIRD_PARTY_LICENSES.md、各素材目录的许可文件，以及 validation/full-rights-evidence/rights-inventory.json。本项目没有 NASA、ESA、JAXA、原作者或影视作品的官方背书。

## English

Voyager is a browser-based 3D astronomy and geography explorer with separate desktop/mobile interfaces and offline resources. It includes 220 landmarks, 79 surface-data catalog objects and 369 black-hole/candidate targets, alongside larger astronomical catalogs. Catalogs overlap and are incomplete; procedural structures are explicitly distinguished from observations.

Original program portions are MIT-licensed. Data, images, music, fonts, embedded constellation patterns and third-party software retain their own licences. The assembled edition contains noncommercial restrictions. See LICENSING.md and NOTICE before redistribution or reuse. Build with Node.js 20+, npm and Python 3; the password helper prompts privately. Automated checks do not certify real-device appearance or frame rates. No GitHub upload or publication was performed in this preparation step.

## 最后核查说明

可按当前声明作为自己的程序项目开源，须保留第三方来源与许可。源码未检出外部UI模板依赖；Three.js及esbuild的实际安装包版权与许可已核对。星座连接数据改编自Stellarium Modern，保留CC BY-SA4.0和固定版本出处，不能标成全部原创。完整组合版含非商业素材，不是每一项都采用MIT的发行版。

不必要的完整网页缓存已退出公开副本，来源摘要、哈希和科学数值事实仍保留。程序与素材主体不变；这轮没有上传GitHub、改动在线网站或完成真机帧率测试。依赖列表中的private:true用于阻止意外npm发布，不表示GitHub仓库必须私有。
