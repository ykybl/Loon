# Bug 技术细节记录 (AI)

## [001] QQ音乐开屏广告漏网
- **现状描述**: 用户反馈 v9 版本下，App 启动时偶尔仍会出现静态图片或视频形式的开屏广告。
- **技术排查方向**:
    1. **视频 CDN 遗漏**: 视频广告常通过 `qqlive.gtimg.com` 或 `vv.video.qq.com` 加载，需确认此类域名是否已被全量拦截。
    2. **QUIC 隧道**: 腾讯可能利用 `tmeadquic.y.qq.com` 建立 HTTP/3 连接绕过标准 MitM 拦截。
    3. **HTTPDNS 逃逸**: 目前拦截了 119.29.29.29 (IPv4)，但可能存在 IPv6 (2402:4e00::) 的 DNS 解析绕过。
    4. **JS 解构深度**: `musicu.fcg` 的响应体中包含多个 `req_X` 模块，部分广告 ID 可能潜伏在 `comm` 或 `request` 字段中。
- **拟修复策略 (v10)**:
    - 增加视频源 CDN 域名的 `REJECT`。
    - 强制屏蔽 `tmeadquic` 及其对应的 QUIC 端口。
    - 在 JS 中实现针对 `CgiGetAdvert` 和 `AdvertRecord` 的精准定向爆破。
    - 增加曝光 (Exposure) 和点击 (Click) URL 的置空处理，防止 App 验证广告加载状态。

## [002] Node.exe 权限提升错误 (Error 740)
- **现状描述**: 电脑持续弹出对话框提示 `D:\Apps\Code\Node\node.exe` “请求的操作需要提升”。
- **技术细节**: 
    - 错误码: 740 (ERROR_ELEVATION_REQUIRED)。
- **拟修复策略**:
    - 建议用户取消 `node.exe` 的“以管理员身份运行”兼容性设置。
- **状态**: 🟡 待验证

## [003] 微信朋友圈广告拦截失效
- **现状描述**: 用户请求开发微信朋友圈去广告插件。
- **技术挑战**: 
    - 微信朋友圈 (Timeline) 采用私有协议，且数据可能在特定区域 (sh, sz, hk) 进行分片。
    - 接口 `gettimeline` 的响应体包含复杂的嵌套对象，广告通常通过 `ADInfo` 或 `advertisement` 标记。
    - 公众号文章广告通过 `getappmsgad` 下发，需处理 `advertisement_info` 数组。
- **实现方案**:
    - **Plugin 层**: 拦截 `*.api.wechat.com` 和 `mp.weixin.qq.com`。
    - **JS 层**: 使用 `JSON.parse` 解析响应体，递归或定向查找并删除广告节点。
    - **域名层**: 拦截 `720.qq.com` (广告全景图) 和 `ad.weixin.qq.com`。
- **状态**: 🟡 待验证
