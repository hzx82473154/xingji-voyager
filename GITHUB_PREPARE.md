# GitHub 发布准备与真机检查

这份交付先用于建立**私有仓库**。当前未替你创建仓库、上传文件或公开内容；在线网站保持现状。

## 可以填写的项目简介

中文：星际 Voyager：支持电脑、手机及离线浏览的三维宇宙与地球地理探索项目。原创程序代码采用 MIT，数据与素材分别授权，完整组合版用于非商业信息浏览。

English: Voyager: a browser-based 3D universe and Earth explorer with separate desktop/mobile interfaces and offline resources. Original program code is MIT-licensed; datasets and media retain their own licences. The assembled edition is for noncommercial exploration.

建议仓库名：xingji-voyager。config.json 中 GitHub 地址目前只是通用占位，创建仓库后才能填写真实地址。

## 先上传私有仓库

1. 创建空的 private 仓库，暂时不添加 GitHub 自动生成的 README、许可证或忽略文件，避免覆盖交付文件。
2. 解压 Voyager-source.zip。上传其中 Voyager-source/ 内的源码文件，而不是将 ZIP 当作整个仓库，也不要上传旧工程目录或原始 Git 历史。
3. 保留 LICENSE、NOTICE、LICENSING.md、完整第三方声明及逐项署名。忽略文件已排除依赖、生成部署包和常见私密配置。
4. 完整包约 200 MB，建议使用 GitHub Desktop 或 git 上传。交付清单没有超过 GitHub 单文件 100 MiB 上限的文件，仍需遵守账户实际配额。
5. 仅给确实需要共同维护的人写权限；展示给朋友不需要给仓库写权限。朋友可查看公开网页，源码仓库可以继续私有。

准备 git 提交前运行：

```sh
npm ci
npm run check
npm run test:release
python scripts/build-with-password.py
git status --short
```

构建产物用于部署，默认不进源码提交。检查暂存文件列表后提交；若要公开发行离线应用，应同时提供独立许可组件和署名材料，并单独处理发行包。

本包清除的是公开交付副本中的旧文件和配置，没有重写现有托管项目的历史。请从这个干净目录建立新仓库，避免把以前的工程历史带入。

## 你需要完成的真实设备检查

自动检查已覆盖程序启动与数据完整性；以下项目需要在你自己的设备操作。当前未将它们标成通过。

| 项目 | 电脑 | 手机 | 检查内容 |
| --- | --- | --- | --- |
| 进入项目 | 待检查 | 待检查 | 正确密码进入；错误密码拒绝；刷新后无空白或异常提示 |
| 界面 | 待检查 | 待检查 | 名称、导航、工具、缩放按钮无重叠；手机区块可收起、横竖屏正常 |
| 地球探索 | 待检查 | 待检查 | 进入大洲、地标、相片、返回上一步；边界、地标与底图观感 |
| 镜头 | 待检查 | 待检查 | 拖动、双击、缩放；电脑右键返回、Shift 加速缩放；手机手势不触发页面异常放大 |
| 天体与轨道 | 待检查 | 待检查 | 太阳系卫星、两条天体带、恒星系统和黑洞可查看，无异常光斑或位置跳变 |
| 流畅度 | 待检查 | 待检查 | 近地、太阳系、深空连续操作；记录设备、浏览器、屏幕刷新率和实际帧率 |
| 音乐 | 待检查 | 待检查 | 经用户交互后播放、暂停、循环；音量轻；页面无重复播放 |
| 离线 | 待检查 | 待检查 | 使用完整离线包断网后进入，查看地图、景点照片、观测图片及音乐 |

本次没有实测 80/120 帧。遇到问题时记录操作路径、设备、浏览器版本与录屏，再确定要更新哪一端。

## 决定公开时

- 查看最终暂存文件，确认原创代码 MIT 与第三方例外完整保留；如实说明已测试设备和未验证的体验项。真机体验检查是质量事项，不是增加的版权授权门槛。
- 公开仓库会让别人下载和 fork 源码；MIT 还允许他们按声明修改、分发自己的代码副本。保留署名与许可不能阻止合法复制。
- 没有写权限的人不能直接修改你的原仓库。不要把部署令牌、邮箱密码或访问口令加入仓库和历史。
- 完整组合版保留非商业材料；代码开源不等于可以商业使用全部素材。
- 本轮不要求再对照 ORBIT，也不把 ORBIT 比较列为发布前阻塞项。

参考：[GitHub 许可说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)、[大文件限制](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)。
