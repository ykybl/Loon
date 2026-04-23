/**
 * QQ音乐响应体解构脚本 v15 (激励大满贯)
 * 逻辑：由“防御型拦截”转为“进攻型伪装”。
 * 核心功能：
 *   1. 模拟领取激励时长 (GetWatchAdFreeTime/CgiGetReward)。
 *   2. 继续清理开屏、商业弹窗、信息流广告。
 */

let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 1. 深度清理逻辑：针对所有广告及营销节点
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

        // 2. 激励/权限伪装：模拟已观看广告
        function fakeVipStatus(node) {
            if (typeof node !== 'object' || node === null) return;
            if (Array.isArray(node)) {
                node.forEach(fakeVipStatus);
                return;
            }
            for (let key in node) {
                if (key === 'play_popup' || key === 'end_popup' || key === 'popup_content') {
                    node[key] = {};
                }
                if (key === 'free_listen_info') {
                    node[key] = {
                        "is_free": true,
                        "remain_time": 3600,
                        "has_free_listen_privilege": true,
                        "show_free_listen_entry": false
                    };
                }
                if (typeof node[key] === 'object') {
                    fakeVipStatus(node[key]);
                }
            }
        }

        // 策略 A：主接口 musicu.fcg
        if (url.indexOf("musicu.fcg") !== -1 || url.indexOf("musics.fcg") !== -1) {
            safeClean(obj);
            fakeVipStatus(obj);
            
            // 针对特定激励接口强行返回成功报文
            const rewardModules = [
                "GetWatchAdFreeTime", 
                "CgiGetReward", 
                "GetAdFreePlayInfo", 
                "GetMarketing",
                "CgiBatchGetAdvert"
            ];
            
            rewardModules.forEach(mod => {
                for (let k in obj) {
                    if (k.includes(mod)) {
                        obj[k] = { 
                            code: 0, 
                            data: { 
                                code: 0,
                                ret: 0,
                                remaining_time: 3600, 
                                is_free: true,
                                free_time: 3600,
                                has_free_listen_privilege: true,
                                splash: {}, 
                                adlist: [] 
                            } 
                        };
                    }
                }
            });
        }

        // 策略 B：针对 tmead 和 adstats 的响应劫持，返回完美的空成功状态
        if (url.indexOf("tmead") !== -1 || url.indexOf("adstats") !== -1 || url.indexOf("i2.y.qq.com") !== -1) {
            obj = {
                "ret": 0, "code": 0, "msg": "ok",
                "data": { 
                    "adList": [], "splash": {}, "ad_info": {},
                    "remaining_time": 3600, "is_free": true 
                }
            };
        }

        body = JSON.stringify(obj);
    } catch (e) {
        // console.log("QQMusic v15 Error: " + e);
    }
}

$done({ body });
