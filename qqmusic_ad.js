/**
 * QQ音乐响应体解构脚本 v11 (修复版)
 * 核心：回归稳健逻辑，仅清空核心广告字段，不干涉业务逻辑。
 */

let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 深度递归置空核心逻辑：仅针对明确的广告容器
        const targetKeys = [
            'ad_info', 'splash', 'splash_ad', 'adlist', 'tmead', 
            'loginad', 'focus_ad', 'splash_video_play_info', 'ad_share_info'
        ];

        function safeClean(node) {
            if (typeof node !== 'object' || node === null) return;
            
            if (Array.isArray(node)) {
                node.forEach(safeClean);
                return;
            }
            
            for (let key in node) {
                let lowerKey = key.toLowerCase();
                // 仅针对明确定义的广告节点进行清空，不使用模糊匹配
                if (targetKeys.includes(lowerKey)) {
                    node[key] = Array.isArray(node[key]) ? [] : {};
                } else {
                    safeClean(node[key]);
                }
            }
        }

        // 策略 A：处理主接口 musicu.fcg
        if (url.indexOf("musicu.fcg") !== -1) {
            safeClean(obj);
            // 针对特定模块返回空数据
            ["CgiGetAdvert", "AdvertRecord"].forEach(mod => {
                for (let k in obj) {
                    if (k.includes(mod)) {
                        obj[k] = { code: 0, data: { adlist: [], splash: {} } };
                    }
                }
            });
        }

        // 策略 B：处理专项广告接口
        if (url.indexOf("tmead") !== -1 || url.indexOf("adstats") !== -1) {
            obj = {
                "ret": 0, "code": 0, "msg": "ok",
                "data": { "adList": [], "splash": {}, "ad_info": {} }
            };
        }

        body = JSON.stringify(obj);
    } catch (e) {
        console.log("QQMusic v11 Fix Error: " + e);
    }
}

$done({ body });
