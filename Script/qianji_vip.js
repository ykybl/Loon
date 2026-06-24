/**
 * 钱迹本地 VIP 解锁脚本 - 适配 v5.5.5+
 * 作者：ykybl0007
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
            console.log("钱迹：检测到高危 VIP 云端请求 (" + url.split("/").slice(-2).join("/") + ")，已主动拦截以防封号！(ykybl0007)");
            $done({ body: JSON.stringify({ ec: 0, em: "ok", data: {} }) });
        } else if (body.includes('"ec":8888') && body.includes('40009')) {
            let fakeBody = JSON.stringify({ ec: 0, em: "ok", data: {} });
            
            if (url.includes("/syncv2/pull")) {
                fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { list: [], hasmore: 0, lasttime: Math.floor(Date.now() / 1000) } });
            } else if (url.includes("/bill/syncall")) {
                let sIds = [];
                try {
                    let rBody = $request.body;
                    if (rBody) {
                        let m = rBody.match(/%22id%22%3A(\d+)/g) || rBody.match(/"id":(\d+)/g);
                        if (m) {
                            sIds = m.map(x => parseInt(x.match(/\d+/)[0]));
                        }
                    }
                } catch(e) {}
                fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { successids: sIds, failids: [] } });
            } else if (url.includes("/tag/syncall") || url.includes("/category/syncall")) {
                fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { list: [], lasttime: Math.floor(Date.now() / 1000) } });
            } else if (url.includes("/active/home")) {
                fakeBody = JSON.stringify({ ec: 0, em: "ok", data: { viptype: 100, isvip: true, vipend: 4092599349, banners: [], activities: [] } });
            }
            console.log("钱迹：code=40009 拦截 [" + url.split("/").slice(-2).join("/") + "] (ykybl0007)");
            $done({ body: fakeBody });
        } else if (url.includes("/bill/") || url.includes("/syncv2/") || url.includes("/tag/") || url.includes("/category/")) {
            // 精准放行数据同步接口，避免 JS JSON.parse() 丢失 64位长整型 ID 精度！
            $done({ body });
        } else {
            let obj = JSON.parse(body);

            const deepUnlock = (target) => {
                if (typeof target !== 'object' || target === null) return;
                const keys = Object.keys(target);
                for (let key of keys) {
                    const lk = key.toLowerCase();
                    if (lk === 'isvip' || lk === 'is_vip' || lk === 'vip') {
                        if (typeof target[key] === 'boolean' || typeof target[key] === 'number') target[key] = true;
                    } else if (lk === 'viptype' || lk === 'vip_type') {
                        target[key] = 100;
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
            console.log("钱迹 VIP 解锁成功 (ykybl0007)");
            $done({ body });
        }
    } catch (e) {
        console.log("钱迹 VIP 脚本异常: " + e);
        $done({ body });
    }
} else {
    $done({});
}
