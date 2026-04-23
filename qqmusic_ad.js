/**
 * QQ音乐响应体解构脚本 v26 (全域强杀版)
 * 目标：无差别清理所有广告、营销、弹窗、追踪。
 * 注意：由于开启了深度修改，可能会导致“看广告免费听”等激励功能报网络异常，请知悉。
 */

let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 深度递归置空所有已知的广告及营销相关容器
        const targetKeys = [
            'ad_info', 'splash', 'splash_ad', 'adlist', 'tmead', 
            'loginad', 'focus_ad', 'splash_video_play_info', 'ad_share_info',
            'marketing', 'popup_info', 'vip_icon', 'msg_box', 
            'advert_info', 'advert_list', 'free_listen_info', 'popup_content'
        ];

        function deepClean(node) {
            if (typeof node !== 'object' || node === null) return;
            if (Array.isArray(node)) {
                node.forEach(deepClean);
                return;
            }
            for (let key in node) {
                let lowerKey = key.toLowerCase();
                if (targetKeys.includes(lowerKey)) {
                    node[key] = Array.isArray(node[key]) ? [] : {};
                } else if (key === 'play_popup' || key === 'end_popup') {
                    node[key] = {};
                } else {
                    deepClean(node[key]);
                }
            }
        }

        if (url.indexOf("musicu.fcg") !== -1 || url.indexOf("musics.fcg") !== -1) {
            deepClean(obj);
            
            // 针对特定模块强制置空数据
            const adModules = [
                "CgiGetAdvert", 
                "AdvertRecord", 
                "CgiGetMarketing", 
                "CgiGetVipIcon", 
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

        // 处理其他域名（tmead 等）返回的数据包，直接伪装成功且没数据的状态
        if (url.indexOf("tmead") !== -1 || url.indexOf("adstats") !== -1 || url.indexOf("i2.y.qq.com") !== -1) {
            obj = {
                "ret": 0, "code": 0, "msg": "ok",
                "data": { "adList": [], "splash": {}, "ad_info": {} }
            };
        }

        body = JSON.stringify(obj);
    } catch (e) {
        // 解析异常则跳过
    }
}

$done({ body });
