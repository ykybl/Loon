/**
 * 钱迹快捷指令云端代工脚本 (Loon)
 * 作用：绕过本地快捷指令的 VIP 限制与异常弹窗拦截，抓取身份凭证供云端 CF 使用。
 * 原理：
 * 1. 拦截官方 API 自动抓取并更新本地 Token、资产列表和分类列表；
 * 2. 拦截虚拟请求 hijack_add_bill 返回凭证及配置信息，由快捷指令提供给云端 CF 进行解析与最终推送。
 * 
 * 作者：ykybl0055
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
                body: JSON.stringify({ error: "缺失授权数据。请先打开一次钱迹App，下拉刷新一次列表，以便脚本抓取凭证" }) 
            } 
        });
    } else {
        const authHeaders = JSON.parse(headersStr);
        const categories = categoriesStr ? JSON.parse(categoriesStr) : [];
        const assets = assetsStr ? JSON.parse(assetsStr) : [];

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
                    body: JSON.stringify({ error: "无法从您的本地资产中提取UID，请去钱迹里新建一个资产或分类后再试！" }) 
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
} else {
    $done({});
}
