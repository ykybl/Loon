/**
 * @name WeChat_Super_AdBlock.js
 * @desc 微信终极去广告脚本 - 结合 ddgksf2013, blackmatrix7 等开源仓库逻辑
 * @author ykybl0001
 * @updated 2026-04-23
 */

const url = $request.url;
let body = $response.body;

if (!body) $done({});

try {
    if (url.indexOf("/mp/getappmsgad") > -1) {
        // 公众号文章广告净化
        let obj = JSON.parse(body);
        if (obj.advertisement_num > 0 || obj.ad_info || obj.advertisement_info) {
            obj.advertisement_num = 0;
            obj.advertisement_info = [];
            if (obj.ad_info) obj.ad_info = [];
            console.log("微信公众号广告已净化");
        }
        body = JSON.stringify(obj);
    } 
    else if (url.indexOf("/cgi-bin/micromsg-bin/gettimeline") > -1 || url.indexOf("/cgi-bin/micromsg-bin/getsnsline") > -1) {
        // 朋友圈广告过滤
        let obj = JSON.parse(body);
        if (obj.TimelineObjectList || obj.SnsObjectList) {
            const listKey = obj.TimelineObjectList ? "TimelineObjectList" : "SnsObjectList";
            const initialCount = obj[listKey].length;
            
            obj[listKey] = obj[listKey].filter(item => {
                // 1. 显式广告标记检测
                if (item.ADInfo || item.AdInfo || item.ad_info || item.is_ad || item.advertisement || item.ad_xml || item.ad_type) {
                    return false;
                }
                
                // 2. 推广/广告标签检测 (XML 结构或字段)
                const content = item.Content || "";
                if (content.indexOf("<adInfo>") > -1 || content.indexOf("<advertisement>") > -1 || content.indexOf("推广") > -1 || content.indexOf("广告") > -1) {
                    return false;
                }
                
                // 3. 嵌套广告对象检测
                if (item.SnsObject && (item.SnsObject.ADInfo || item.SnsObject.is_ad || item.SnsObject.AdInfo)) {
                    return false;
                }
                
                // 4. 特殊 ID 匹配 (针对部分流式广告)
                if (item.Id && (item.Id.startsWith("ad_") || item.Id.indexOf("advertisement") > -1)) {
                    return false;
                }

                return true;
            });
            
            const removedCount = initialCount - obj[listKey].length;
            if (removedCount > 0) {
                console.log(`朋友圈广告已净化: 剔除 ${removedCount} 条广告`);
            }
        }
        body = JSON.stringify(obj);
    }
} catch (e) {
    // 可能是加密数据或非 JSON 格式，保持原样返回以防微信崩溃
    // console.log("微信去广告脚本解析失败 (可能为 Protobuf): " + e.message);
}

$done({ body });
