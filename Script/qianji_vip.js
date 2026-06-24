/**
 * 钱迹本地 VIP 解锁脚本 - 适配 v5.5.5+
 * 作者：ykybl0004
 *
 * v4 修复：
 *  - 针对不同接口返回定制化的假成功响应，而非统一的空 data{}
 *  - 同步接口（syncall/pull）返回空列表成功体，避免 [未同步] 标签永久残留
 *  - active/home 返回含 VIP 标记的首页数据，修复"请升级会员"提示
 *  - 仅 VIP 相关接口做字段深度解锁
 */
let body = $response.body;
let url = ($request && $request.url) ? $request.url : "";

if (body) {
    try {
        let obj = JSON.parse(body);

        // ======================================================
        // 核心安全防护：主动拦截可能导致封号的"云端 VIP 功能"请求
        // 如果用户尝试上传图片等需要云端 VIP 权限的操作，直接拦截并伪装成功
        // 从而保护账号不被服务端风控系统拉黑
        // ======================================================
        if (url.includes("/bill/upload_image") || url.includes("/billimg/") || url.includes("/billimg")) {
            console.log("钱迹：检测到高危 VIP 云端请求（上传附件），已主动拦截以防封号！(ykybl0004)");
            $done({ body: JSON.stringify({ ec: 0, em: "ok", data: {} }) });
            return;
        }

        // ======================================================
        // 针对 ec=8888 / code=40009 做分接口定制化修复
        // ======================================================
        if (obj.ec === 8888) {
            let isBlocked = false;
            try {
                let emObj = JSON.parse(obj.em);
                if (emObj && emObj.code === 40009) { isBlocked = true; }
            } catch (e) {}

            if (isBlocked) {
                let fakeBody = null;

                // 同步下拉接口：返回"没有新数据"的合法成功体
                if (url.includes("/syncv2/pull")) {
                    fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { list: [], hasmore: 0, lasttime: Math.floor(Date.now() / 1000) } });
                }
                // 账单上传同步接口：返回"同步成功"的合法成功体
                else if (url.includes("/bill/syncall")) {
                    fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { successids: [], failids: [] } });
                }
                // 标签/分类同步接口
                else if (url.includes("/tag/syncall") || url.includes("/category/syncall")) {
                    fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { list: [], lasttime: Math.floor(Date.now() / 1000) } });
                }
                // 首页活动/图表接口：返回含 VIP 标记的最小成功体
                else if (url.includes("/active/home")) {
                    fakeBody = JSON.stringify({
                        ec: 0, em: "ok",
                        data: {
                            viptype: 100,
                            isvip: true,
                            vipend: 4092599349,
                            banners: [],
                            activities: []
                        }
                    });
                }
                // 客户端初始化接口：返回最小成功体
                else if (url.includes("/client/init")) {
                    fakeBody = JSON.stringify({ ec: 0, em: "ok", data: {} });
                }
                // 退款/账单操作接口
                else if (url.includes("/bill/refund") || url.includes("/bill/add") || url.includes("/bill/update") || url.includes("/bill/delete")) {
                    fakeBody = JSON.stringify({ ec: 0, em: "ok", data: {} });
                }
                // 其他未知接口：通用空成功体
                else {
                    fakeBody = JSON.stringify({ ec: 0, em: "ok", data: {} });
                }

                console.log("钱迹：code=40009 拦截 [" + url.split("/").slice(-2).join("/") + "] (ykybl0004)");
                $done({ body: fakeBody });
                return;
            }
        }

        // ======================================================
        // VIP 字段深度递归解锁（仅对正常响应生效）
        // ======================================================
        const deepUnlock = (target) => {
            if (typeof target !== 'object' || target === null) return;
            const keys = Object.keys(target);
            for (let key of keys) {
                const lk = key.toLowerCase();
                if (lk === 'isvip' || lk === 'is_vip' || lk === 'vip') {
                    if (typeof target[key] === 'boolean' || typeof target[key] === 'number') target[key] = true;
                } else if (lk === 'viptype' || lk === 'vip_type') {
                    target[key] = 100;
                } else if (lk === 'vipend' || lk === 'vip_end') {
                    target[key] = 4092599349;
                } else if (lk === 'vipstart' || lk === 'vip_start') {
                    target[key] = 1666666666;
                } else if (lk === 'isvipexpired' || lk === 'isvipexpire' || lk === 'is_vip_expired') {
                    target[key] = false;
                } else if (lk === 'freetrial' || lk === 'free_trial') {
                    target[key] = false;
                }
                if (typeof target[key] === 'object' && target[key] !== null) deepUnlock(target[key]);
            }
        };

        // 显式兼容 vip/configios 结构
        if (obj.data && obj.data.config) {
            if (!obj.data.config.userinfo) obj.data.config.userinfo = {};
            Object.assign(obj.data.config.userinfo, { vipend: 4092599349, vipstart: 1666666666, viptype: 100 });
        }

        deepUnlock(obj);
        body = JSON.stringify(obj);
        console.log("钱迹 VIP 解锁成功 (ykybl0004)");
    } catch (e) {
        console.log("钱迹 VIP 脚本异常: " + e);
    }
}

$done({ body });
