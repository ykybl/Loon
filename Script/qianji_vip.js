/**
 * 钱迹本地 VIP 解锁脚本 - 适配 v4.4.3+ 
 * 作者：Antigravity_V1.2
 */
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);
        
        // 1. 递归解锁函数，修改所有包含会员属性的字段
        const deepUnlock = (target) => {
            if (typeof target !== 'object' || target === null) {
                return;
            }
            
            // 针对当前节点拥有的会员属性进行重写
            const keys = Object.keys(target);
            for (let key of keys) {
                const lowerKey = key.toLowerCase();
                
                // 处理布尔类型的会员状态
                if (lowerKey === 'isvip' || lowerKey === 'is_vip' || lowerKey === 'vip') {
                    if (typeof target[key] === 'boolean' || typeof target[key] === 'number') {
                        target[key] = true;
                    }
                }
                // 处理会员类型
                else if (lowerKey === 'viptype' || lowerKey === 'vip_type') {
                    target[key] = 100; // 对应 chxm 的 viptype = 100
                }
                // 处理会员过期时间
                else if (lowerKey === 'vipend' || lowerKey === 'vip_end') {
                    target[key] = 4092599349; // 2099年左右
                }
                // 处理会员开始时间
                else if (lowerKey === 'vipstart' || lowerKey === 'vip_start') {
                    target[key] = 1666666666;
                }
                // 处理过期标志
                else if (lowerKey === 'isvipexpired' || lowerKey === 'isvipexpire' || lowerKey === 'is_vip_expired') {
                    target[key] = false;
                }
                // 处理免费试用标志
                else if (lowerKey === 'freetrial' || lowerKey === 'free_trial') {
                    target[key] = false;
                }
                
                // 递归处理子节点
                if (typeof target[key] === 'object' && target[key] !== null) {
                    deepUnlock(target[key]);
                }
            }
        };

        // 2. 显式兼容 vip/configios 数据结构
        // 如果包含 data.config.userinfo，则直接注入/重写，避免某些字段不存在而无法被递归修改
        if (obj.data && obj.data.config) {
            if (!obj.data.config.userinfo) {
                obj.data.config.userinfo = {};
            }
            obj.data.config.userinfo.vipend = 4092599349;
            obj.data.config.userinfo.vipstart = 1666666666;
            obj.data.config.userinfo.viptype = 100;
        }

        // 3. 执行全局深度递归解锁
        deepUnlock(obj);
        
        body = JSON.stringify(obj);
        console.log("钱迹本地 VIP 解锁成功 (Antigravity_V1.2)！");
    } catch (e) {
        console.log("钱迹本地 VIP 解锁脚本执行失败: " + e);
    }
}

$done({ body });
