let body = $response.body;
try {
    let obj = JSON.parse(body);
    
    // 递归清理带有广告特征、商城特征的节点
    function cleanNodes(node) {
        if (Array.isArray(node)) {
            for (let i = node.length - 1; i >= 0; i--) {
                let item = node[i];
                if (item && typeof item === 'object') {
                    // 判断各种特征
                    let type = (item.type || item.componentType || item.moduleType || item.cardType || "").toLowerCase();
                    let title = (item.title || item.name || item.text || item.bizId || "").toLowerCase();
                    
                    let isAd = item.isAd || item.adInfo || item.ad_id || item.hasAd;
                    let isMall = type.includes("mall") || title.includes("商城") || title.includes("买买") || title.includes("特卖") || title.includes("优惠");
                    let isBanner = type.includes("banner") || type.includes("promotion") || type.includes("ad_") || type.includes("splash");
                    
                    // 额外清理可能嵌入的推荐流
                    let isFeed = type.includes("feed") && (title.includes("推荐") || title.includes("发现"));

                    if (isAd || isMall || isBanner || isFeed) {
                        console.log("Cainiao AdBlock - Removed Node: " + (title || type));
                        node.splice(i, 1);
                    } else {
                        cleanNodes(item);
                    }
                }
            }
        } else if (typeof node === 'object' && node !== null) {
            for (let key in node) {
                // 如果外层对象直接包含广告属性，可根据需求直接清空
                cleanNodes(node[key]);
            }
        }
    }
    
    if (obj.data) {
        cleanNodes(obj.data);
    }
    
    body = JSON.stringify(obj);
} catch (e) {
    console.log("Cainiao AdBlock JSON Parse Error: " + e);
}

$done({body: body});
