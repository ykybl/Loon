/**
 * QQ音乐响应体解构脚本 v16 (稳健回归版)
 * 逻辑：移除导致“网络开小差”的实验性伪造逻辑，回归至更稳定的深度去广告模式。
 * 对激励视频：由 Plugin 直接放行接口逻辑，仅由 Rewrite 拦截其图片/视频素材。
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

        // 2. 移除全屏阻断提示，但不篡改权限数据
        function removePopups(node) {
            if (typeof node !== 'object' || node === null) return;
            if (Array.isArray(node)) {
                node.forEach(removePopups);
                return;
            }
            for (let key in node) {
                if (key === 'play_popup' || key === 'end_popup' || key === 'popup_content') {
                    node[key] = {};
                } else if (typeof node[key] === 'object') {
                    removePopups(node[key]);
                }
            }
        }

        if (url.indexOf("musicu.fcg") !== -1 || url.indexOf("musics.fcg") !== -1) {
            safeClean(obj);
            removePopups(obj);
            
            // 下面这些模块直接清空数据，但不修改 code
            const adModules = ["CgiGetAdvert", "AdvertRecord", "CgiGetMarketing"];
            adModules.forEach(mod => {
                for (let k in obj) {
                    if (k.includes(mod)) {
                        obj[k] = { code: 0, data: { adlist: [], splash: {}, marketing_info: {} } };
                    }
                }
            });
        }

        body = JSON.stringify(obj);
    } catch (e) {
        // 静默处理解析错误
    }
}

$done({ body });
