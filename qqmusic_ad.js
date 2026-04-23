/**
 * QQ音乐响应体解构脚本 v17 (极简安全版)
 * 目标：仅移除开屏广告，完全不触碰播放页、弹窗页、营销页的数据，确保功能 100% 正常。
 */

let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 仅针对明确合法的开屏广告模块进行清空
        if (url.indexOf("musicu.fcg") !== -1) {
            const safeSplashModules = ["CgiGetAdvert", "AdvertRecord"];
            safeSplashModules.forEach(mod => {
                for (let k in obj) {
                    if (k.includes(mod)) {
                        obj[k] = { code: 0, data: { adlist: [], splash: {} } };
                    }
                }
            });
            
            // 针对开屏节点的深度清理（如果存在于主结构中）
            if (obj.code === 0 && obj.data) {
                if (obj.data.splash) obj.data.splash = {};
                if (obj.data.ad_info) obj.data.ad_info = {};
            }
        }

        body = JSON.stringify(obj);
    } catch (e) {
        // 报错则原样返回
    }
}

$done({ body });
