/**
 * QQ音乐响应体解构脚本 v20 (兼容净化版)
 * 目标：在不干扰“领时长”和“激励视频”逻辑的前提下，去除开屏广告和 UI 冗余模块。
 */

let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 1. 定义明确的广告/营销清理字段
        const targetKeys = [
            'splash', 'splash_ad', 'adlist', 'tmead', 
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
                // ！！！注意：绝不触摸 ad_info 字段，防止领时长报错
                if (targetKeys.includes(lowerKey)) {
                    node[key] = Array.isArray(node[key]) ? [] : {};
                } else {
                    safeClean(node[key]);
                }
            }
        }

        // 2. 针对主接口的处理
        if (url.indexOf("musicu.fcg") !== -1 || url.indexOf("musics.fcg") !== -1) {
            safeClean(obj);
            
            // 下面这些模块直接清空数据，但不修改 code
            const adModules = ["CgiGetAdvert", "AdvertRecord", "CgiGetMarketing"];
            adModules.forEach(mod => {
                for (let k in obj) {
                    if (k.includes(mod)) {
                        obj[k] = { code: 0, data: { adlist: [], splash: {} } };
                    }
                }
            });

            // v20 特别保护：确保播放逻辑节点不报错
            if (obj.code === 0 && obj.data) {
                if (obj.data.splash) obj.data.splash = {};
                // 保留 obj.data.ad_info 的原始状态
            }
        }

        body = JSON.stringify(obj);
    } catch (e) {
        // 静默处理解析错误
    }
}

$done({ body });
