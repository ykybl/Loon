// QQ音乐响应体解构脚本 v2：暴力深度遍历，剿灭所有开屏与广告变体节点
let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        let modified = false;

        // 定义需要无情切除的黑名单关键字（全部小写）
        const adKeywords = ['ad', 'ad_info', 'splash', 'splash_ad', 'adlist', 'tmead', 'v_ad', 'loginad', 'focus_ad', 'splash_info'];

        // 递归遍历清理函数
        function cleanNode(node) {
            if (typeof node !== 'object' || node === null) return;
            
            // 如果是数组，遍历内部元素
            if (Array.isArray(node)) {
                for (let i = 0; i < node.length; i++) {
                    cleanNode(node[i]);
                }
                return;
            }

            // 如果是对象，检查所有键名
            for (let key in node) {
                let lowerKey = key.toLowerCase();
                
                // 如果键名完全匹配黑名单，或者包含开屏/tmead特征，直接删除该节点
                if (adKeywords.includes(lowerKey) || lowerKey.includes('splash') || lowerKey.includes('tmead')) {
                    delete node[key];
                    modified = true;
                } else {
                    // 否则继续向深层挖掘
                    cleanNode(node[key]);
                }
            }
        }

        cleanNode(obj);
        
        // 只有在真正修改了数据后才重新序列化，节省性能
        if (modified) {
            body = JSON.stringify(obj);
        }
    } catch (e) {
        console.log("QQMusic Script Parse Error: " + e);
    }
}
$done({ body });
