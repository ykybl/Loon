/**
 * QQ音乐响应体解构脚本 v12 (净化版)
 * 逻辑：在 v11 基础上，增加对营销弹窗、看广告免听提示、VIP图标等“内生广告”的清理。
 * 目标：实现 UI 极致净化，同时保护核心播放逻辑不被干扰。
 */

let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 1. 深度递归置空：仅针对明确的广告及营销容器
        const targetKeys = [
            'ad_info', 'splash', 'splash_ad', 'adlist', 'tmead', 
            'loginad', 'focus_ad', 'splash_video_play_info', 'ad_share_info',
            'marketing', 'popup_info', 'vip_icon', 'free_listen_info', 'msg_box'
        ];

        function safeClean(node) {
            if (typeof node !== 'object' || node === null) return;
            
            if (Array.isArray(node)) {
                node.forEach(safeClean);
                return;
            }
            
            for (let key in node) {
                let lowerKey = key.toLowerCase();
                if (targetKeys.includes(lowerKey)) {
                    node[key] = Array.isArray(node[key]) ? [] : {};
                } else {
                    safeClean(node[key]);
                }
            }
        }

        // 策略 A：处理主接口 musicu.fcg (Batch 模式)
        if (url.indexOf("musicu.fcg") !== -1) {
            safeClean(obj);
            // 针对特定营销/广告模块强制返回空数据或标准成功状态
            const adModules = [
                "CgiGetAdvert", 
                "AdvertRecord", 
                "CgiGetMarketing", 
                "CgiGetVipIcon", 
                "GetFeedClickMsg",
                "GetWatchAdFreeTime"
            ];
            
            adModules.forEach(mod => {
                for (let k in obj) {
                    if (k.includes(mod)) {
                        obj[k] = { code: 0, data: { adlist: [], splash: {}, marketing_info: {} } };
                    }
                }
            });
        }

        // 策略 B：处理专项广告/行为接口
        if (url.indexOf("tmead") !== -1 || url.indexOf("adstats") !== -1) {
            obj = {
                "ret": 0, "code": 0, "msg": "ok",
                "data": { "adList": [], "splash": {}, "ad_info": {} }
            };
        }

        body = JSON.stringify(obj);
    } catch (e) {
        console.log("QQMusic v12 Clean Error: " + e);
    }
}

$done({ body });
