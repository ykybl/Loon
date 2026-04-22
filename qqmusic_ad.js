// QQ音乐响应体解构脚本：精准切除广告与开屏节点
let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);

        // 递归遍历并剔除所有与广告和开屏相关的节点
        function removeAds(node) {
            if (typeof node !== 'object' || node === null) return;
            for (let key in node) {
                // 匹配常见的广告字段：ad, ad_info, splash, splash_ad, adList 等
                if (/^(ad|ad_info|splash|splash_ad|adList)$/i.test(key)) {
                    delete node[key];
                } else if (typeof node[key] === 'object') {
                    removeAds(node[key]);
                }
            }
        }

        removeAds(obj);
        body = JSON.stringify(obj);
    } catch (e) {
        console.log("QQMusic Script Parse Error: " + e);
    }
}
$done({ body });
