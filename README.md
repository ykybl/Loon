# Loon 插件仓库

本项目用于存�?Loon 插件及其配套�?JavaScript 处理脚本，旨在提�?App 的使用体验，去除广告及冗余内容�?
## 目录结构说明

为了更好地管理不断增加的插件，仓库采用了以下目录结构�?
- **[Plugin/](Plugin/)**: 存放 `.plugin` 配置文件。您可以直接�?Loon 中通过 URL 订阅这些文件�?- **[Script/](Script/)**: 存放插件配套�?`.js` 处理脚本�?- **[Tracking/](Tracking/)**: 存放开发进度、Bug 记录及技术文档（面向开发与维护）�?
## 维护规范

- **文档同步更新**: 每次添加新的插件时，都必须在这个 `README.md` 文档内进行对应的修改与追加说明�?
## 已上线插�?
### 1. 微信去广�?(WeChat_AdBlock)
- **功能**: 超级净化版。精准去除朋友圈广告、视频号/公众号植入式推荐、公众号文章广告。结合墨鱼、BlackMatrix7 等社区逻辑�?- **配置**: [WeChat_AdBlock.plugin](https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/WeChat_AdBlock.plugin)
- **要求**: 需开�?MITM 并信任证书�?
### 2. QQ 音乐去广�?(QQMusic_AdBlock)
- **功能**: 拦截开屏广告、屏蔽主接口弹窗及营销页面、净化主接口数据结构�?- **配置**: [QQMusic_AdBlock.plugin](https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/QQMusic_AdBlock.plugin)

### 3. 钱迹本地会员解锁 (qianji_vip)
- **功能**: 解锁本地钱迹会员权限（支�?v4.4.3+ ），配合 iOS 原生快捷指令可以实现全自动、免跳转的无感记账�?- **配置**: [qianji_vip.plugin](https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/qianji_vip.plugin)

### 4. 钱迹 AI 解析本地劫持 (qianji_ai_hijack)
- **功能**: 拦截* 钱迹本地 VIP 解锁 - 适配 v5.5.5+
* 钱迹 OCR 请求劫持 - 用于转发请求到自建云�?
### 5. 钱迹 AI 自动记账核心 (云端代工�?
**版本**：`v0017`
**功能说明**�?- 自动拦截钱迹官方 API（`/api/asset/list`、`/api/category/list`），抓取并持久化保存 Token 凭证及资产分类数据�?- 拦截特定虚拟网关（`/hijack_add_bill`）提取凭证数据供外部快捷指令使用�?- **[v0017 新特性]** 完美适配 iOS 快捷指令的请求体丢失 Bug，提�?`/get_token.json` 接口直接返回 JSON 格式�?Token 凭证，配�?Cloudflare Worker 实现最稳定的双步推流直达钱迹服务器�?
**订阅链接**: `https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/qianji_auto_shortcut.plugin`

### 6. 菜鸟去广告净�?(Cainiao_AdBlock)
- **功能**: 拦截菜鸟 APP 内开屏广告、物流详情横幅、推流列表页等原生广告，以及广点通、穿山甲等第三方联盟请求�?- **配置**: [Cainiao_AdBlock.plugin](https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/Cainiao_AdBlock.plugin)

## 如何使用

1. 打开 Loon App�?2. 进入 `配置` -> `插件`�?3. 点击 `+` 号，选择 `�?URL 下载`�?4. 输入对应插件�?Raw 代理链接（建议复制下方链接）�?   - 微信: `https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/WeChat_AdBlock.plugin`
   - QQ音乐: `https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/QQMusic_AdBlock.plugin`
   - 钱迹会员解锁(含AI劫持): `https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/qianji_vip.plugin`
   - 菜鸟去广�? `https://ghproxy.net/https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/Cainiao_AdBlock.plugin`
5. 开启插件，并确�?MITM 主机名中已包含插件所需的域名�?
## 免责声明

本项目仅供学习与交流使用，请勿用于非法用途。脚本功能可能随 App 版本更新而失效�
