// QQ音乐响应体解构脚本 v3：新增“伪装空响应”策略，防止触发本地兜底广告
let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 策略1：如果请求的是正常的歌曲/配置主接口，进行深度切割
        if (url.indexOf("musicu.fcg") !== -1) {
            const adKeywords = ['ad', 'ad_info', 'splash', 'splash_ad', 'adlist', 'tmead', 'v_ad', 'loginad', 'focus_ad', 'splash_info'];
            
            function cleanNode(node) {
                if (typeof node !== 'object' || node === null) return;
                if (Array.isArray(node)) {
                    for (let i = 0; i < node.length; i++) cleanNode(node[i]);
                    return;
                }
                for (let key in node) {
                    let lowerKey = key.toLowerCase();
                    if (adKeywords.includes(lowerKey) || lowerKey.includes('splash') || lowerKey.includes('tmead')) {
                        delete node[key];
                    } else {
                        cleanNode(node[key]);
                    }
                }
            }
            cleanNode(obj);
        }

        // 策略2：如果请求的是专属广告接口，伪装成标准但无广告的成功响应
        if (url.indexOf("tmead") !== -1 || url.indexOf("adstats") !== -1) {
            // 给客户端返回它期望的标准 JSON 结构，但数据为空
            obj = {
                "ret": 0,
                "code": 0,
                "subcode": 0,
                "msg": "ok",
                "data": [],
                "req_1": { "code": 0, "data": {} },
                "req_2": { "code": 0, "data": {} }
            };
        }

        body = JSON.stringify(obj);
    } catch (e) {
        console.log("QQMusic Script Parse Error: " + e);
    }
}

$done({ body });
