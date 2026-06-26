/**
 * 閽辫抗蹇嵎鎸囦护浜戠浠ｅ伐鑴氭湰 (Loon)
 * 浣滅敤锛氱粫杩囨湰鍦板揩鎹锋寚浠ょ殑 VIP 闄愬埗涓庡紓甯稿脊绐楁閿併€?
 * 鍘熺悊锛氭嫤鎴嚜瀹氫箟鏈湴璇锋眰锛岃皟鐢?CF 浜戠澶фā鍨嬶紝鐒跺悗浣跨敤淇濆瓨鐨勫畼鏂?Token 鐩存帴鍚戦挶杩规湇鍔″櫒闈欓粯鍐欏叆璐﹀崟锛?
 * 
 * 作者：ykybl0052
 */

const url = ($request && $request.url) ? $request.url : "";

// ==========================================
// 妯″潡 1锛氳鍔ㄦ姄鍙栧苟鏇存柊韬唤鍑嵁锛堣繍琛屽湪閽辫抗 App 鍐呮椂锛?
// ==========================================
if (url.includes("api.qianjiapp.com") && !url.includes("api.qianjiapp.com/hijack_add_bill")) {
    if (url.includes("/category/list") || url.includes("/asset/list") || url.includes("/syncv2/pull")) {
        // 淇濆瓨鍏ㄩ噺璇锋眰澶达紙鍖呭惈鎺堟潈淇℃伅锛?
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
                    console.log("閽辫抗锛氭垚鍔熸姄鍙栧苟鏇存柊鍒嗙被鍒楄〃锛?);
                }
            } catch(e) {}
        } else if (url.includes("/asset/list")) {
            try {
                let obj = JSON.parse($response.body);
                if (obj.data && obj.data.list) {
                    $persistentStore.write(JSON.stringify(obj.data.list), "qianji_assets");
                    console.log("閽辫抗锛氭垚鍔熸姄鍙栧苟鏇存柊璧勪骇鍒楄〃锛?);
                }
            } catch(e) {}
        }
    }
    $done({});
}

// ==========================================
// 妯″潡 2锛氭嫤鎴揩鎹锋寚浠ょ殑铏氭嫙璇锋眰骞朵唬宸ユ墽琛?
// ==========================================
else if (url.includes("api.qianjiapp.com/hijack_add_bill")) {
    console.log("钱迹：收到 iOS 快捷指令发来的 AI 记账请求，准备 307 重定向...");
    const headersStr = $persistentStore.read("qianji_auth_headers");
    const categoriesStr = $persistentStore.read("qianji_categories");
    const assetsStr = $persistentStore.read("qianji_assets");

    if (!headersStr) {
        $done({ response: { status: 400, body: JSON.stringify({ error: "缺失授权数据。请先打开一次钱迹App，下拉刷新一次列表，以便脚本抓取凭证" }) } });
        return;
    }

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
        $done({ response: { status: 400, body: JSON.stringify({ error: "无法从您的本地资产中提取UID，请去钱迹里新建一个资产或分类后再试！" }) } });
        return;
    }

    let tok = authHeaders["tok"] || "";
    let cookie = authHeaders["Cookie"] || authHeaders["cookie"] || "";

    const redirectUrl = `https://qianji.renflyp.dpdns.org/?uid=${encodeURIComponent(qianjiUid)}&tok=${encodeURIComponent(tok)}&cookie=${encodeURIComponent(cookie)}`;
    
    $done({
        response: {
            status: 307,
            headers: {
                "Location": redirectUrl
            }
        }
    });
} else {
    $done({});
}
