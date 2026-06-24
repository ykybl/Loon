/**
 * 钱迹本地 VIP 解锁脚本 - 适配 v5.5.5+
 * 作者：ykybl0003
 *
 * 修复：拦截 ec=8888 / code=40009 "账号异常" 响应
 * 原因：/client/init、/active/home 等核心接口会返回 ec=8888+code=40009，
 *       App 读取到此错误码后弹出"账号异常"弹窗并锁定所有功能。
 *       需同时在 VIP 解锁的基础上，将这些异常响应替换为正常的空成功体。
 */
let body = $response.body;
let url = $request ? $request.url : "";

if (body) {
    try {
        let obj = JSON.parse(body);

        // ======================================================
        // 第一步：拦截并修复 ec=8888 / code=40009 账号异常响应
        // 所有 api.qianjiapp.com 接口如果返回该错误，直接返回成功体
        // ======================================================
        if (obj.ec === 8888) {
            try {
                let emObj = JSON.parse(obj.em);
                if (emObj && emObj.code === 40009) {
                    console.log("钱迹：检测到 code=40009 账号异常，已拦截并替换为成功响应 (ykybl0003)");
                    body = JSON.stringify({ ec: 0, em: "success", data: obj.data || {} });
                    $done({ body });
                    return;
                }
            } catch (e) {
                // em 字段解析失败，继续走 VIP 解锁流程
            }
        }

        // ======================================================
        // 第二步：VIP 字段深度递归解锁
        // ======================================================
        const deepUnlock = (target) => {
            if (typeof target !== 'object' || target === null) {
                return;
            }
            const keys = Object.keys(target);
            for (let key of keys) {
                const lowerKey = key.toLowerCase();
                if (lowerKey === 'isvip' || lowerKey === 'is_vip' || lowerKey === 'vip') {
                    if (typeof target[key] === 'boolean' || typeof target[key] === 'number') {
                        target[key] = true;
                    }
                } else if (lowerKey === 'viptype' || lowerKey === 'vip_type') {
                    target[key] = 100;
                } else if (lowerKey === 'vipend' || lowerKey === 'vip_end') {
                    target[key] = 4092599349;
                } else if (lowerKey === 'vipstart' || lowerKey === 'vip_start') {
                    target[key] = 1666666666;
                } else if (lowerKey === 'isvipexpired' || lowerKey === 'isvipexpire' || lowerKey === 'is_vip_expired') {
                    target[key] = false;
                } else if (lowerKey === 'freetrial' || lowerKey === 'free_trial') {
                    target[key] = false;
                }
                if (typeof target[key] === 'object' && target[key] !== null) {
                    deepUnlock(target[key]);
                }
            }
        };

        // 显式兼容 vip/configios 数据结构
        if (obj.data && obj.data.config) {
            if (!obj.data.config.userinfo) {
                obj.data.config.userinfo = {};
            }
            obj.data.config.userinfo.vipend = 4092599349;
            obj.data.config.userinfo.vipstart = 1666666666;
            obj.data.config.userinfo.viptype = 100;
        }

        // 全局深度递归解锁
        deepUnlock(obj);

        body = JSON.stringify(obj);
        console.log("钱迹本地 VIP 解锁成功 (ykybl0003)！");
    } catch (e) {
        console.log("钱迹本地 VIP 解锁脚本执行失败: " + e);
    }
}

$done({ body });
