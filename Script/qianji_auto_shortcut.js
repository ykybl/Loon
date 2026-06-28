/**
 * 钱迹快捷指令云端代工脚本 (Loon)
 * 作用：绕过本地快捷指令的 VIP 限制与异常弹窗拦截，抓取身份凭证供云端 CF 使用。
 * 原理：
 * 1. 拦截官方 API 自动抓取并更新本地 Token、资产列表和分类列表；
 * 2. 拦截虚拟请求 hijack_add_bill 返回凭证及配置信息，由快捷指令提供给云端 CF 进行解析与最终推送。
 * 
 * 作者：ykybl0072
 */

const url = ($request && $request.url) ? $request.url : "";

// ==========================================
// 模块 1：被动抓取并更新身份凭证（运行在钱迹 App 内时）
// ==========================================
if (url.includes("api.qianjiapp.com") && !url.includes("api.qianjiapp.com/hijack_add_bill") && !url.includes("api.qianjiapp.com/auto_push_bill") && !url.includes("api.qianjiapp.com/get_token.json")) {
    
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
    console.log("钱迹：收到快捷指令凭证请求，提取本地 Token 并返回...");
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

        try {
            authHeaders = JSON.parse(headersStr);
        } catch (e) {
            parseError += `解析 headers 失败: ${e.message}; `;
        }

        try {
            categories = categoriesStr ? JSON.parse(categoriesStr) : [];
        } catch (e) {
            parseError += `解析 categories 失败: ${e.message}; `;
        }

        try {
            assets = assetsStr ? JSON.parse(assetsStr) : [];
        } catch (e) {
            parseError += `解析 assets 失败: ${e.message}; `;
        }

        if (parseError) {
            $done({
                response: {
                    status: 200,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                    body: JSON.stringify({ success: false, error: `凭证解析失败: ${parseError}` })
                }
            });
        } else {
            let qianjiUid = "";
            if (assets && assets.length > 0 && assets[0].userid) {
                qianjiUid = assets[0].userid;
            } else if (categories && categories.length > 0 && categories[0].userid) {
                qianjiUid = categories[0].userid;
            }

            if (!qianjiUid) {
                $done({ 
                    response: { 
                        status: 200, 
                        headers: { "Content-Type": "application/json; charset=utf-8" },
                        body: JSON.stringify({ success: false, error: "无法从您的本地资产中提取UID，请去钱迹里新建一个资产或分类后再试！" }) 
                    } 
                });
            } else {
                // 返回包含全套凭证、资产、分类的 JSON 给快捷指令
                const tokenPayload = {
                    success: true,
                    uid: qianjiUid,
                    auth_headers: authHeaders,
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
            }
        }
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
