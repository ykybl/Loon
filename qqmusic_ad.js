/**
 * QQ音乐响应体解构脚本 v10 (旗舰版)
 * 逻辑：针对 musicu.fcg 的 batch 请求进行全路径深度递归扫描。
 * 策略：保留基础骨架（防止 App 崩溃/重连），定向排空广告节点内容。
 * 覆盖：静态开屏、视频开屏、信息流广告、行为上报。
 */

let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 1. 深度递归置空核心逻辑
        const blackList = [
            'ad', 'ad_info', 'splash', 'splash_ad', 'adlist', 'tmead', 'v_ad', 
            'loginad', 'focus_ad', 'advert', 'adv', 'exposure', 'feedback', 
            'report', 'click', 'splash_video_play_info', 'ad_share_info'
        ];

        function deepClean(node, depth = 0) {
            // 防止无限递归
            if (depth > 20 || typeof node !== 'object' || node === null) return;
            
            if (Array.isArray(node)) {
                node.forEach(item => deepClean(item, depth + 1));
                return;
            }
            
            for (let key in node) {
                let lowerKey = key.toLowerCase();
                
                // 命中心标字段
                if (blackList.some(k => lowerKey.includes(k))) {
                    if (Array.isArray(node[key])) {
                        node[key] = [];
                    } else if (typeof node[key] === 'object') {
                        node[key] = {};
                    } else if (typeof node[key] === 'string') {
                        // 如果字符串中包含 URL，可能是素材链接或追踪链接
                        if (node[key].startsWith('http')) {
                            node[key] = ""; 
                        } else if (lowerKey.includes('id')) {
                            node[key] = "0"; // 关键 ID 置零
                        }
                    } else {
                        node[key] = 0;
                    }
                } else {
                    // 没命中则继续向下探测
                    deepClean(node[key], depth + 1);
                }
            }
        }

        // 策略 A：处理主接口 musicu.fcg (通常为 batch 结构)
        if (url.indexOf("musicu.fcg") !== -1) {
            deepClean(obj);
            // 针对某些特定 Module 强制二次清理
            ["CgiGetAdvert", "AdvertRecord", "GetSplashConfig"].forEach(mod => {
                for (let k in obj) {
                    if (k.includes(mod)) {
                        obj[k] = { code: 0, data: { adlist: [], splash: {} } };
                    }
                }
            });
        }

        // 策略 B：处理专项广告/上报接口，返回极简成功状态
        if (url.indexOf("tmead") !== -1 || url.indexOf("adstats") !== -1 || url.indexOf("monitor") !== -1) {
            obj = {
                "ret": 0,
                "code": 0,
                "subcode": 0,
                "msg": "ok",
                "data": { "adList": [], "splash": {}, "ad_info": {} }
            };
        }

        body = JSON.stringify(obj);
    } catch (e) {
        console.log("QQMusic v10 Script Error: " + e);
        // 出错时不干预原 body，确保 App 稳定性
    }
}

$done({ body });
