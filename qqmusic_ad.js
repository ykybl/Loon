// QQ音乐响应体解构脚本 v4：保留数据结构，仅清空内容，防止触发客户端容灾兜底
let url = $request.url;
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);

        // 策略1：处理正常的主接口数据
        if (url.indexOf("musicu.fcg") !== -1) {
            // 深度遍历：保留结构，清空内容
            function safeEmpty(node) {
                if (typeof node !== 'object' || node === null) return;
                
                if (Array.isArray(node)) {
                    node.forEach(safeEmpty);
                    return;
                }
                
                for (let k in node) {
                    let lk = k.toLowerCase();
                    // 命中嫌疑节点
                    if (['ad', 'ad_info', 'splash', 'splash_ad', 'adlist', 'tmead', 'v_ad', 'loginad', 'focus_ad'].includes(lk) || lk.includes('tmead')) {
                        // 极其关键：保留原有数据类型，期望数组给空数组，期望对象给空对象
                        node[k] = Array.isArray(node[k]) ? [] : {};
                    } else {
                        safeEmpty(node[k]);
                    }
                }
            }
            safeEmpty(obj);
        }

        // 策略2：处理纯广告接口，返回完美的空状态
        if (url.indexOf("tmead") !== -1 || url.indexOf("adstats") !== -1) {
            obj = {
                "ret": 0,
                "code": 0,
                "subcode": 0,
                "msg": "ok",
                "data": {
                    "adList": [],
                    "splash": {},
                    "ad_info": {}
                }
            };
        }

        body = JSON.stringify(obj);
    } catch (e) {
        console.log("QQMusic Script Parse Error: " + e);
    }
}

$done({ body });
