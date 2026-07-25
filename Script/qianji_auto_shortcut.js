/**
 * 钱迹快捷指令云端代工脚本 (Loon)
 * 作用：绕过本地快捷指令的 VIP 限制与异常弹窗拦截，抓取身份凭证供云端 CF 使用。
 * 原理：
 * 1. 拦截官方 API 自动抓取并更新本地 Token、资产列表和分类列表；
 * 2. 拦截虚拟请求 hijack_add_bill 返回凭证及配置信息，由快捷指令提供给云端 CF 进行解析与最终推送。
 * 
 * 作者：ykybl0073
 */

const url = ($request && $request.url) ? $request.url : "";

// ==========================================
// 模块 1：被动抓取并更新身份凭证（运行在钱迹 App 内时）
// ==========================================
if ((url.includes("api.qianjiapp.com") || url.includes("qianji.xxoojoke.com")) && !url.includes("hijack_add_bill") && !url.includes("auto_push_bill") && !url.includes("get_token.json")) {
    
    // 只要是正常的钱迹 API 请求，都抓取其 Headers 中的 Token
    let authHeaders = $request.headers;
    if (authHeaders["tok"] || authHeaders["Tok"]) {
        $persistentStore.write(JSON.stringify(authHeaders), "qianji_auth_headers");
        console.log("钱迹：成功拦截最新请求并刷新本地 Token 凭证");
    }

    if ($response && $response.body) {
        if (url.includes("/category/list")) {
            try {
                let obj = JSON.parse($response.body);
                if (obj.data && obj.data.list) {
                    $persistentStore.write(JSON.stringify(obj.data.list), "qianji_categories");
                    console.log("钱迹：成功抓取并更新分类列表");
                }
            } catch(e) {}
        } else if (url.includes("/asset/list")) {
            try {
                let obj = JSON.parse($response.body);
                if (obj.data && obj.data.list) {
                    $persistentStore.write(JSON.stringify(obj.data.list), "qianji_assets");
                    console.log("钱迹：成功抓取并更新资产列表");
                }
            } catch(e) {}
        }
    }
    $done({});
}

// ==========================================
// 模块 2：拦截快捷指令的虚拟请求，返回 Token 凭证
// ==========================================
else if (url.includes("api.qianjiapp.com/hijack_add_bill")) {
    console.log("钱迹：收到快捷指令凭证请求，正在实时刷新 Token...");
    const headersStr = $persistentStore.read("qianji_auth_headers");
    const categoriesStr = $persistentStore.read("qianji_categories");
    const assetsStr = $persistentStore.read("qianji_assets");

    if (!headersStr) {
        $done({ 
            response: { 
                status: 200, 
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({ success: false, error: "缺失授权数据。请先打开一次钱迹App，下拉刷新一次列表，以便脚本抓取凭证" }) 
            } 
        });
    } else {
        let authHeaders = {};
        let categories = [];
        let assets = [];
        let parseError = "";

        try { authHeaders = JSON.parse(headersStr); } catch (e) { parseError += `解析 headers 失败: ${e.message}; `; }
        try { categories = categoriesStr ? JSON.parse(categoriesStr) : []; } catch (e) { parseError += `解析 categories 失败: ${e.message}; `; }
        try { assets = assetsStr ? JSON.parse(assetsStr) : []; } catch (e) { parseError += `解析 assets 失败: ${e.message}; `; }

        if (parseError) {
            $done({ response: { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ success: false, error: `凭证解析失败: ${parseError}` }) } });
            return;
        }

        let qianjiUid = "";
        if (assets && assets.length > 0 && assets[0].userid) qianjiUid = assets[0].userid;
        else if (categories && categories.length > 0 && categories[0].userid) qianjiUid = categories[0].userid;

        if (!qianjiUid) {
            $done({ response: { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ success: false, error: "无法从您的本地资产中提取UID，请去钱迹里新建一个资产或分类后再试！" }) } });
            return;
        }

        // ============================================================
        // 关键修复：实时向服务器发一次 syncv2/pull 请求来刷新 tok
        // tok 是服务器签发的有时效 Session Token，缓存的旧 tok 会失效
        // ============================================================
        const targetHost = authHeaders["host"] || authHeaders["Host"] || "qianji.xxoojoke.com";
        const pullUrl = `https://${targetHost}/syncv2/pull`;

        // 构建 pull 请求的 headers（复用缓存的 headers，但 tok 和 reqidv2 由服务器赋予新值）
        const freshPullHeaders = Object.assign({}, authHeaders);
        // 生成新的随机 reqidv2（pull 不需要签名校验，随机即可）
        function genHex32() {
            let r = "";
            const c = "0123456789abcdef";
            for (let i = 0; i < 32; i++) r += c[Math.floor(Math.random() * c.length)];
            return r;
        }
        freshPullHeaders["reqidv2"] = genHex32();
        freshPullHeaders["act"] = "pull";
        freshPullHeaders["ctrl"] = "syncv2";
        freshPullHeaders["Content-Type"] = "application/x-www-form-urlencoded";
        delete freshPullHeaders["content-length"];
        delete freshPullHeaders["Content-Length"];
        delete freshPullHeaders["host"];
        delete freshPullHeaders["Host"];

        const pullBody = "uid=" + encodeURIComponent(qianjiUid) + "&fr=" + encodeURIComponent(qianjiUid) + "&v=%7B%22syncv2%22%3A%7B%22changelist%22%3A%22%5B%5D%22%7D%7D";

        $httpClient.post({
            url: pullUrl,
            headers: freshPullHeaders,
            body: pullBody
        }, function(error, response, data) {
            let freshAuthHeaders = authHeaders; // 降级：若刷新失败则用旧 headers

            if (!error && response && response.headers) {
                // 从响应 headers 中提取服务器返回的新 tok
                const respHeaders = response.headers;
                const newTok = respHeaders["tok"] || respHeaders["Tok"] || respHeaders["TOK"];
                if (newTok) {
                    console.log("钱迹：成功刷新 tok: " + newTok);
                    freshAuthHeaders = Object.assign({}, authHeaders);
                    freshAuthHeaders["tok"] = newTok;
                    freshAuthHeaders["Tok"] = newTok;
                    // 同时存储最新的 headers 供下次使用
                    $persistentStore.write(JSON.stringify(freshAuthHeaders), "qianji_auth_headers");
                } else {
                    console.log("钱迹：pull 响应中没有 tok header，使用缓存凭证。响应体: " + data);
                }
            } else {
                console.log("钱迹：pull 刷新失败，使用缓存凭证。error=" + JSON.stringify(error));
            }

            const tokenPayload = {
                success: true,
                uid: qianjiUid,
                auth_headers: freshAuthHeaders,
                categories: categories,
                assets: assets,
                worker_url: "https://qianji.renflyp.dpdns.org"
            };

            $done({
                response: {
                    status: 200,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                    body: JSON.stringify(tokenPayload)
                }
            });
        });
    }
}
// ==========================================
// 模块 3：获取本地凭证 (供快捷指令直接调用)
// ==========================================
else if (url.includes("api.qianjiapp.com/get_token.json")) {
    console.log("钱迹：快捷指令请求获取本地凭证...");

    const headersStr = $persistentStore.read("qianji_auth_headers");
    const categoriesStr = $persistentStore.read("qianji_categories");
    const assetsStr = $persistentStore.read("qianji_assets");

    if (!headersStr) {
        $done({ response: { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ success: false, error: "缺失授权数据。请先打开一次钱迹App刷新列表。" }) }});
        return;
    }

    let authHeaders = {};
    let categories = [];
    let assets = [];
    let qianjiUid = "";

    try { authHeaders = JSON.parse(headersStr); } catch(e) { authHeaders = {}; }
    try { categories = categoriesStr ? JSON.parse(categoriesStr) : []; } catch(e) { categories = []; }
    try { assets = assetsStr ? JSON.parse(assetsStr) : []; } catch(e) { assets = []; }

    try {
        if (authHeaders && authHeaders["Userid"]) qianjiUid = authHeaders["Userid"];
        else if (authHeaders && authHeaders["userid"]) qianjiUid = authHeaders["userid"];
    } catch(e) {}

    const responsePayload = {
        success: true,
        uid: qianjiUid,
        auth_headers: authHeaders,
        categories: categories,
        assets: assets
    };

    $done({
        response: {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(responsePayload)
        }
    });
} else {
    $done({});
}
