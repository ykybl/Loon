/**
 * @name WeChat_AdBlock.js
 * @desc 微信去广告脚本 - 处理朋友圈和公众号广告
 * @author ykybl0027 (AI Generated)
 * @updated 2026-04-23
 */

const url = $request.url;
let body = $response.body;

try {
    if (url.indexOf("/mp/getappmsgad") > -1) {
        // 公众号文章广告
        let obj = JSON.parse(body);
        if (obj.advertisement_num > 0) {
            obj.advertisement_num = 0;
            obj.advertisement_info = [];
            delete obj.ad_info;
        }
        body = JSON.stringify(obj);
        console.log("微信公众号广告已净化");
    } 
    else if (url.indexOf("/cgi-bin/micromsg-bin/gettimeline") > -1) {
        // 朋友圈广告
        let obj = JSON.parse(body);
        if (obj.TimelineObjectList) {
            const initialCount = obj.TimelineObjectList.length;
            obj.TimelineObjectList = obj.TimelineObjectList.filter(item => {
                // 常见的广告标记字段
                if (item.ADInfo || item.AdInfo || item.advertisement || item.is_ad) {
                    return false;
                }
                // 检查内容中是否包含推广字样（部分版本）
                if (item.Content && item.Content.indexOf("推广") > -1) {
                    return false;
                }
                return true;
            });
            console.log(`朋友圈广告已净化: 剔除 ${initialCount - obj.TimelineObjectList.length} 条广告`);
        }
        body = JSON.stringify(obj);
    }
} catch (e) {
    console.log("微信去广告脚本执行异常: " + e.message);
}

$done({ body });
