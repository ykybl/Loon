/**
 * 钱迹本地 VIP 解锁脚本 - 适配 v5.5.5+
 * 作者：ykybl0016
 */
let url = ($request && $request.url) ? $request.url : "";

// ======================================================
// 【请求拦截】处理 AI 解析劫持 (http-request)
// ======================================================
if (typeof $response === "undefined") {
    if (url.includes("/emmav2/ocr2bill")) {
        const customApiUrl = "https://qianji.renflyp.dpdns.org/parse";
        console.log("钱迹：检测到官方 AI 解析请求，正在劫持转发到自建后端...");

        const options = {
            url: customApiUrl,
            headers: {
                "Content-Type": "application/json"
            },
            body: $request.body
        };

        $httpClient.post(options, function(error, response, data) {
            if (error) {
                console.log("钱迹 AI 劫持请求失败：" + JSON.stringify(error));
                $done({});
            } else {
                console.log("钱迹 AI 劫持解析成功，完美返回 JSON 结果给官方通道！");
                $done({
                    response: {
                        status: 200,
                        headers: { "Content-Type": "application/json; charset=utf-8" },
                        body: data
                    }
                });
            }
        });
    } else {
        $done({});
    }
} 
// ======================================================
// 【响应拦截】处理 VIP 解锁和 40009 拦截 (http-response)
// ======================================================
else {
    let body = $response.body;

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
                console.log("钱迹：检测到高危 VIP 云端请求 (" + url.split("/").slice(-2).join("/") + ")，已主动拦截以防封号！(ykybl0016)");
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

                if (isBlocked) {
                    let fakeBody = JSON.stringify({ ec: 0, em: "ok", data: {} });
                    
                    if (url.includes("/syncv2/pull")) {
                        fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { list: [], hasmore: 0, lasttime: Math.floor(Date.now() / 1000) } });
                    } else if (url.includes("/syncv2/push")) {
                        let sIds = [];
                        try {
                            const reqBody = JSON.parse($request.body);
                            if (reqBody && reqBody.data) {
                                sIds = reqBody.data.map(item => item.id || "");
                            }
                        } catch(e) {}
                        fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { successids: sIds, failids: [] } });
                    }

                    console.log("钱迹：已成功拦截并放行 40009 弹窗！(ykybl0016)");
                    $done({ body: fakeBody });
                    return;
                }
            }
            
            // 白名单机制：只有明确需要修改 VIP 状态的接口，才进行 JSON 解析和伪造
            const targetUrls = ["/vip/config", "/vip/configios"];
            let shouldUnlock = targetUrls.some(p => url.includes(p));

            if (shouldUnlock && obj) {
                const deepUnlock = (target) => {
                    if (typeof target !== 'object' || target === null) return;
                    const keys = Object.keys(target);
                    for (let key of keys) {
                        const lk = key.toLowerCase();
                        if (lk === 'isvip' || lk === 'is_vip' || lk === 'vip') {
                            if (typeof target[key] === 'boolean' || typeof target[key] === 'number') target[key] = true;
                        } else if (lk === 'viptype' || lk === 'vip_type') {
                            target[key] = 100; // 保持 100 以通过快捷指令本地校验
                        } else if (lk === 'vipend' || lk === 'vip_end') {
                            target[key] = 4092599349;
                        } else if (lk === 'vipstart' || lk === 'vip_start') {
                            target[key] = 1666666666;
                        } else if (lk === 'isvipexpired' || lk === 'isvipexpire' || lk === 'is_vip_expired') {
                            target[key] = false;
                        } else if (lk === 'freetrial' || lk === 'free_trial') {
                            target[key] = false;
                        }
    }
} else {
    $done({});
}
