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

            if (isBlocked || obj.ec === 8888) {
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
                } else if (url.includes("/user/profile") || url.includes("/vip/config") || url.includes("/user/info")) {
                    // 为被封号的用户强制返回一个完美的 VIP 身份，避免个人资料页空白和 AI 功能锁死
                    const fakeUser = {
                        nickname: "超级VIP(防封版)",
                        vipend: 4092599349,
                        vipstart: 1666666666,
                        viptype: 100,
                        isvip: true,
                        email: "2801306727@qq.com",
                        uid: 999999
                    };
                    fakeBody = JSON.stringify({ 
                        ec: 0, 
                        em: "ok", 
                        data: { config: { userinfo: fakeUser }, userinfo: fakeUser, isvip: true } 
                    });
                } else if (url.includes("/bill/upload_image") || url.includes("/billimg")) {
                    // 伪造上传成功，以便让后续的 AI 流程能够拿到一个虚假的图片 URL 继续走下去
                    fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { url: "https://qianji.renflyp.dpdns.org/dummy.jpg" } });
                }

                console.log("钱迹：已成功拦截 8888 封号状态，并为其注入了完美的伪造数据！(ykybl0018)");
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
                    if (typeof target[key] === 'object' && target[key] !== null) deepUnlock(target[key]);
                }
            };

            if (obj.data && obj.data.config) {
                if (!obj.data.config.userinfo) obj.data.config.userinfo = {};
                Object.assign(obj.data.config.userinfo, { vipend: 4092599349, vipstart: 1666666666, viptype: 100 });
            }

            deepUnlock(obj);
            body = JSON.stringify(obj);
            console.log("钱迹 VIP 解锁成功 (ykybl0017)");
        }
        
        $done({ body });
    } catch (error) {
        console.log("钱迹解锁脚本出错：" + error);
        $done({ body });
    }
} else {
    $done({});
}
