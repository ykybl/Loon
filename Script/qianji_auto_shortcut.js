/**
 * 钱迹快捷指令云端代工脚本 (Loon)
 * 作用：绕过本地快捷指令的 VIP 限制与异常弹窗拦截，抓取身份凭证供云端 CF 使用。
 * 原理：
 * 1. 拦截官方 API 自动抓取并更新本地 Token、资产列表和分类列表；
 * 2. 拦截虚拟请求 hijack_add_bill 返回凭证及配置信息，由快捷指令提供给云端 CF 进行解析与最终推送。
 * 
 * 作者：ykybl0059
 */

const url = ($request && $request.url) ? $request.url : "";

// ==========================================
// 模块 1：被动抓取并更新身份凭证（运行在钱迹 App 内时）
// ==========================================
if (url.includes("api.qianjiapp.com") && !url.includes("api.qianjiapp.com/hijack_add_bill")) {
    
    if (url.includes("/category/list") || url.includes("/asset/list") || url.includes("/syncv2/pull")) {
        let authHeaders = $request.headers;
        if (authHeaders["tok"]) authHeaders["tok"] = authHeaders["tok"];
        if (authHeaders["reqidv2"]) authHeaders["reqidv2"] = authHeaders["reqidv2"];
        
        $persistentStore.write(JSON.stringify(authHeaders), "qianji_auth_headers");
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
// 模块 3：拦截终极直推请求，自动注入本地凭证并转发给 CF
// ==========================================
else if (url.includes("api.qianjiapp.com/auto_push_bill")) {
    console.log("钱迹：收到快捷指令终极推送请求，正在自动注入凭证并发往云端...");
    
    // 1. 读取快捷指令发来的 body，获取 worker_url 和 bill
    let reqBody = {};
    try {
        reqBody = JSON.parse($request.body);
    } catch(e) {
        $done({ response: { status: 400, body: JSON.stringify({ success: false, error: "请求体不是合法的 JSON" }) }});
    }

    const workerUrl = reqBody.worker_url;
    const billData = reqBody.bill;

    if (!workerUrl || !billData) {
        $done({ response: { status: 400, body: JSON.stringify({ success: false, error: "请求体缺失 worker_url 或 bill 参数" }) }});
    }

    // 2. 读取本地持久化凭证
    const headersStr = $persistentStore.read("qianji_auth_headers");
    const categoriesStr = $persistentStore.read("qianji_categories");
    const assetsStr = $persistentStore.read("qianji_assets");

    if (!headersStr) {
        $done({ response: { status: 400, body: JSON.stringify({ success: false, error: "缺失授权数据。请先打开一次钱迹App刷新列表。" }) }});
    }

    let authHeaders = {};
    let categories = [];
    let assets = [];
    try { authHeaders = JSON.parse(headersStr); } catch(e) {}
    try { categories = categoriesStr ? JSON.parse(categoriesStr) : []; } catch(e) {}
    try { assets = assetsStr ? JSON.parse(assetsStr) : []; } catch(e) {}

    let qianjiUid = "";
    if (assets && assets.length > 0 && assets[0].userid) qianjiUid = assets[0].userid;
    else if (categories && categories.length > 0 && categories[0].userid) qianjiUid = categories[0].userid;

    // 3. 组装最终推给 CF 的数据
    const finalPayload = {
        bill: billData,
        payload: {
            uid: qianjiUid,
            auth_headers: authHeaders,
            categories: categories,
            assets: assets
        }
    };

    // 4. 使用 Loon 的 HttpClient 发起真正的推送请求
    $httpClient.post({
        url: workerUrl,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload)
    }, function(error, response, data) {
        if (error) {
            console.log("钱迹：转发云端失败：" + JSON.stringify(error));
            $done({ response: { status: 500, body: JSON.stringify({ success: false, error: "Loon 转发请求到 CF 失败", details: error }) }});
        } else {
            console.log("钱迹：云端直推完成，返回结果给快捷指令：" + data);
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
