# 技术任务规划 (Task_Ai)

## 🛠 开发节点
### 1. 插件层 (Plugin) [待开始]
- **域名扩充**: 增加 `beacon.qq.com`, `monitor.music.qq.com`, `adcdn.tencentmusic.com`, `oth.eve.mdt.qq.com`。
- **协议阻断**: `DOMAIN-SUFFIX, tmeadquic.y.qq.com, REJECT`。
- **DNS 强杀**: 增加 IPv6 的 `2402:4e00::/32` 拦截。
- **策略组**: 考虑是否建议用户使用 Reject-Img 策略。

### 2. 脚本层 (JS) [待开始]
- **精细化递归**: 为 `musicu.fcg` 增加模块级识别。
- **黑词库扩充**: `advert`, `splash`, `exposure`, `report`, `click`, `v_ad`, `ad_info`, `ad_share_info`。
- **防崩溃增强**: 确保返回值严格遵循原 JSON 结构，避免数组/对象混淆导致的 Null Pointer Error。

### 3. 微信增强层 (WeChat) [已部署]
- [x] 朋友圈过滤: 拦截 `gettimeline` 接口，剔除 `ad` 字段。
- [x] 公众号净化: 拦截 `getappmsgad` 接口，返回空数据或精简结构。
- [x] 域名封杀: 增加 `ad.weixin.qq.com`, `720.qq.com` 拦截。

## 🧪 验证节点
- [ ] 模拟 `u.y.qq.com` 响应体，验证 JS 递归深度。
- [ ] 检查 Loon 是否正确接管 `qqlive.gtimg.com` 的流量。
