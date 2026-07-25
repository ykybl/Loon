# Loon 插件仓库

本项目收录各类 Loon 的 JavaScript 脚本与插件，旨在改善 App 使用体验，去除广告与功能解锁。

## 目录结构说明

- **[Plugin/](Plugin/)**: 存放 `.plugin` 文件，可在 Loon 中通过 URL 链接订阅。
- **[Script/](Script/)**: 存放配套的 `.js` 脚本。
- **[Tracking/](Tracking/)**: 存放抓包与 Bug 记录文档（供开发维护）。

## 维护规范

- **文档同步**: 每次新增插件时，`README.md` 文档内需进行对应修改与追加入口。

## 插件列表

### 1. 微信去广告 (WeChat_AdBlock)
- **功能**: 移除开屏广告、朋友圈广告、视频号/公众号植入式推荐与文章底部广告。
- **订阅链接**: `https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/WeChat_AdBlock.plugin`
- **重要提示**: 需要开启 MITM 证书信任。

### 2. QQ音乐去广告 (QQMusic_AdBlock)
- **功能**: 去除开屏广告、弹窗广告与运营页面推广。
- **订阅链接**: `https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/QQMusic_AdBlock.plugin`

### 3. 钱迹会员解锁 (qianji_vip)
- **功能**: 解锁钱迹会员权限，支持 v4.4.3+ 及 iOS 原生适配。
- **订阅链接**: `https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/qianji_vip.plugin`

### 4. 菜鸟包裹去广告 (Cainiao_AdBlock)
- **功能**: 去除菜鸟 App 内开屏广告、列表页广告及推广。
- **订阅链接**: `https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/Cainiao_AdBlock.plugin`

### 5. 华为运动健康 GT5 个人表盘解锁 (HWHealth_WatchFace)
- **功能**: 解锁华为运动健康 App 中 GT5 等手表的自定义/个人表盘上传与使用权限，解锁表盘服务相关限制，并提供全量商店表盘的 VIP 免付费零元下载。
- **订阅链接**: `https://raw.githubusercontent.com/ykybl/Loon/main/Plugin/HWHealth_WatchFace.plugin`
- **重要提示**: 必须配置 MITM 并解密 `*.hicloud.com`, `*.dbankcloud.cn`, `*.dbankcdn.cn`, `api-drcn.theme.dbankcloud.cn`, `query.hicloud.com` 等域名。

## 使用说明

1. 打开 Loon App
2. 点击 `配置` -> `插件`
3. 点击 `+` 号，选择 `从 URL 订阅`
4. 复制下方 Raw 链接并粘贴进行添加
5. 确保 MITM 已开启并信任 CA 证书

## 免责声明

本项目仅供学习交流使用，请勿用于非法用途。
