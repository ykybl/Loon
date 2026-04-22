/**
 * QQ音乐响应体解构脚本 v14 (实验性逻辑)
 * 逻辑：在 v13 基础上，增加对“试听结束”弹窗的对抗。
 * 策略：尝试伪造“免费听”授权状态，并清理触发弹窗的逻辑节点。
 */

let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 1. 核心去广告及营销清理 (继承 v13)
        const targetKeys = [
            'ad_info', 'splash', 'splash_ad', 'adlist', 'tmead', 
            'loginad', 'focus_ad', 'splash_video_play_info', 'ad_share_info',
            'marketing', 'popup_info', 'vip_icon', 'msg_box', 
            'advert_info', 'advert_list'
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

        // 2. 实验性：伪造免费听时长与清理播放弹窗
        function fakeVipStatus(node) {
            if (typeof node !== 'object' || node === null) return;
            if (Array.isArray(node)) {
                node.forEach(fakeVipStatus);
                return;
            }
            for (let key in node) {
                // 拦截弹窗逻辑
                if (key === 'play_popup' || key === 'end_popup' || key === 'popup_content') {
                    node[key] = {};
                }
                // 伪造免费听信息
                if (key === 'free_listen_info') {
                    node[key] = {
                        "is_free": true,
                        "remain_time": 3600,
                        "has_free_listen_privilege": true,
                        "show_free_listen_entry": false
                    };
                }
                // 继续深度遍历
                if (typeof node[key] === 'object') {
                    fakeVipStatus(node[key]);
                }
            }
        }

        if (url.indexOf("musicu.fcg") !== -1) {
            safeClean(obj);
            fakeVipStatus(obj);
            
            // 针对特定模块返回空数据
            const adModules = ["CgiGetAdvert", "AdvertRecord", "CgiGetMarketing", "GetWatchAdFreeTime"];
            adModules.forEach(mod => {
                for (let k in obj) {
                    if (k.includes(mod)) {
                        obj[k] = { code: 0, data: { adlist: [], splash: {}, marketing_info: {} } };
                    }
                }
            });
        }

        if (url.indexOf("tmead") !== -1 || url.indexOf("adstats") !== -1) {
            obj = { "ret": 0, "code": 0, "data": { "adList": [], "splash": {}, "ad_info": {} } };
        }

        body = JSON.stringify(obj);
    } catch (e) {
        console.log("QQMusic v14 Logic Error: " + e);
    }
}

$done({ body });
