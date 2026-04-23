# Loon 插件仓库

本项目用于存放 Loon 插件及其配套的 JavaScript 处理脚本，旨在提升 App 的使用体验，去除广告及冗余内容。

## 目录结构说明

为了更好地管理不断增加的插件，仓库采用了以下目录结构：

- **[Plugin/](Plugin/)**: 存放 `.plugin` 配置文件。您可以直接在 Loon 中通过 URL 订阅这些文件。
- **[Script/](Script/)**: 存放插件配套的 `.js` 处理脚本。
- **[Tracking/](Tracking/)**: 存放开发进度、Bug 记录及技术文档（面向开发与维护）。

## 已上线插件

### 1. 微信去广告 (WeChat_AdBlock)
- **功能**: 超级净化版。精准去除朋友圈广告、视频号/公众号植入式推荐、公众号文章广告。结合墨鱼、BlackMatrix7 等社区逻辑。
- **配置**: [WeChat_AdBlock.plugin](https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/WeChat_AdBlock.plugin)
- **要求**: 需开启 MITM 并信任证书。

### 2. QQ 音乐去广告 (QQMusic_AdBlock)
- **功能**: 拦截开屏广告、屏蔽主接口弹窗及营销页面、净化主接口数据结构。
- **配置**: [QQMusic_AdBlock.plugin](https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/QQMusic_AdBlock.plugin)

## 如何使用

1. 打开 Loon App。
2. 进入 `配置` -> `插件`。
3. 点击 `+` 号，选择 `从 URL 下载`。
4. 输入对应插件的 Raw 代理链接（建议复制下方链接）：
   - 微信: `https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/WeChat_AdBlock.plugin`
   - QQ音乐: `https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/QQMusic_AdBlock.plugin`
5. 开启插件，并确保 MITM 主机名中已包含插件所需的域名。

## 免责声明

本项目仅供学习与交流使用，请勿用于非法用途。脚本功能可能随 App 版本更新而失效。