/**
 * 钱迹本地 VIP 解锁脚本 - 适配 v5.5.5+
 * 作者：ykybl0017
 */
let body = $response.body;
let url = ($request && $request.url) ? $request.url : "";

if (body) {
    try {
        const dangerousPaths = [
            "/bill/upload_image", "/billimg", 
            "/book/add", "/book/update", "/book/share", "/book/invite", 
            "/budget/", "/budget", 
            "/repeat", "/repeattask", "/installment", 
            "/export"
        ];

        if (dangerousPaths.some(p => url.includes(p))) {
            console.log("钱迹：检测到高危 VIP 云端请求 (" + url.split("/").slice(-2).join("/") + ")，已主动拦截以防封号！(ykybl0017)");
            $done({ body: JSON.stringify({ ec: 0, em: "ok", data: {} }) });
            return;
        }
        
        let obj = null;
        try {
            obj = JSON.parse(body);
        } catch (e) {}

        if (obj && obj.ec === 8888) {
            let isBlocked = false;
            try {
                let emObj = JSON.parse(obj.em);
                if (emObj && emObj.code === 40009) { isBlocked = true; }
            } catch(e) {}
            
            if (!isBlocked && typeof obj.em === 'string' && obj.em.includes("40009")) {
                isBlocked = true;
            }

            // 新版架构：为了避免触发账号异常和断开云同步，不再强行伪造本地 VIP 身份。
            // 现仅保留对开屏广告和更新弹窗的拦截净化功能。
            if (obj.data) {
                if (obj.data.config && obj.data.config.ad) {
                    obj.data.config.ad.status = 0; // 关闭广告
                }
                if (obj.data.ad) {
                    obj.data.ad = []; // 清空广告列表
                }
            }
            $done({ body: JSON.stringify(obj) });
            return;
        }
        // 移除导致“账号异常”的 VIP 深度伪造逻辑 (ykybl0019)
        // 从现在起，钱迹账号恢复到普通健康状态，云同步完全恢复正常，告别死锁！
        $done({ body });
    } catch (error) {
        console.log("钱迹净化脚本出错：" + error);
        $done({ body });
    }
} else {
    $done({});
}
