/**
 * QQ音乐响应体解构脚本 v1.0
 * 逻辑：稳健地清理核心广告字段，不干涉试听/会员等深层业务逻辑。
 */

let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 深度递归置空核心广告逻辑
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
                if (targetKeys.includes(lowerKey)) {
                    node[key] = Array.isArray(node[key]) ? [] : {};
                } else {
                    safeClean(node[key]);
                }
            }
        }

        if (url.indexOf("musicu.fcg") !== -1) {
            safeClean(obj);
            // 针对特定营销模块置空
            ["CgiGetAdvert", "AdvertRecord", "CgiGetMarketing", "CgiGetVipIcon"].forEach(mod => {
                for (let k in obj) {
                    if (k.includes(mod)) {
                        obj[k] = { code: 0, data: { adlist: [], splash: {}, marketing_info: {} } };
                    }
                }
            });
        }

        if (url.indexOf("tmead") !== -1 || url.indexOf("adstats") !== -1 || url.indexOf("i2.y.qq.com") !== -1) {
            obj = {
                "ret": 0, "code": 0, "msg": "ok",
                "data": { "adList": [], "splash": {}, "ad_info": {} }
            };
        }

        body = JSON.stringify(obj);
    } catch (e) {
        // console.log("QQMusic v27 Error: " + e);
    }
}

$done({ body });
