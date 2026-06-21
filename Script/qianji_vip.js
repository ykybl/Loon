/**
 * 钱迹本地 VIP 解锁脚本 - 适配 v4.4.3+ 
 */
let body = $response.body;

if (body) {
    try {
        let obj = JSON.parse(body);
        
        // 核心修改逻辑函数
        const unlockVIP = (target) => {
            if (typeof target === 'object' && target !== null) {
                target.isvip = true;
                target.isVip = true;
                target.vip = true;
                target.viptype = 3;         // 永久会员
                target.vip_type = 3;
                target.vipend = 4070880000; // 过期时间设定为 2099-12-31
                target.vip_end = 4070880000;
                target.isVipExpired = false;
                target.isvipexpired = false;
                target.freeTrial = false;
                target.freetrial = false;
                target.expired = 0;
            }
        };

        // 尝试解锁根节点
        unlockVIP(obj);
        
        // 尝试解锁可能嵌套在 data 属性内的对象
        if (obj.data) {
            unlockVIP(obj.data);
        }
        
        body = JSON.stringify(obj);
        console.log("钱迹本地 VIP 解锁成功！");
    } catch (e) {
        console.log("钱迹本地 VIP 解锁脚本执行失败: " + e);
    }
}

$done({ body });
