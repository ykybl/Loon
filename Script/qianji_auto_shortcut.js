/**
 * 閽辫抗蹇嵎鎸囦护浜戠浠ｅ伐鑴氭湰 (Loon)
 * 浣滅敤锛氱粫杩囨湰鍦板揩鎹锋寚浠ょ殑 VIP 闄愬埗涓庡紓甯稿脊绐楁閿併€?
 * 鍘熺悊锛氭嫤鎴嚜瀹氫箟鏈湴璇锋眰锛岃皟鐢?CF 浜戠澶фā鍨嬶紝鐒跺悗浣跨敤淇濆瓨鐨勫畼鏂?Token 鐩存帴鍚戦挶杩规湇鍔″櫒闈欓粯鍐欏叆璐﹀崟锛?
 * 
 * 浣滆€咃細ykybl0050
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
    console.log("閽辫抗锛氭敹鍒?iOS 蹇嵎鎸囦护鍙戞潵鐨?AI 璁拌处璇锋眰锛?);
    
    let sourceText = "";
    try {
        if (typeof $request.body === 'string') {
            sourceText = $request.body;
        } else if ($request.body && $request.body.text) {
            sourceText = $request.body.text;
        }
    } catch(e) {
        sourceText = $request.body;
    }

    if (!sourceText) {
        $done({ response: { status: 400, body: JSON.stringify({ error: "璇锋眰浣撲腑鏈壘鍒拌处鍗曟枃鏈唴瀹? }) } });
        return;
    }

    // 1. 璇诲彇淇濆瓨鐨勪緷璧栨暟鎹?
    const categoriesStr = $persistentStore.read("qianji_categories");
    const assetsStr = $persistentStore.read("qianji_assets");
    const headersStr = $persistentStore.read("qianji_auth_headers");

    if (!categoriesStr || !assetsStr || !headersStr) {
        $done({ response: { status: 400, body: JSON.stringify({ error: "缂哄け鍏抽敭鏁版嵁銆傝鍏堟墦寮€涓€娆￠挶杩?App锛屼笅鎷夊埛鏂颁竴娆″垪琛紝浠ヤ究鑴氭湰鎶撳彇鍑瘉锛? }) } });
        return;
    }

    const categories = JSON.parse(categoriesStr);
    const assets = JSON.parse(assetsStr);
    const authHeaders = JSON.parse(headersStr);

    // 缁濇潃锛氱洿鎺ヤ粠宸茬粡淇濆瓨鐨勫畼鏂规暟鎹腑鎻愬彇鐪熷疄鐨?userid锛?
    let qianjiUid = "";
    if (assets && assets.length > 0 && assets[0].userid) {
        qianjiUid = assets[0].userid;
    } else if (categories && categories.length > 0 && categories[0].userid) {
        qianjiUid = categories[0].userid;
    }

    if (!qianjiUid) {
        $done({ response: { status: 400, body: JSON.stringify({ error: "鏃犳硶浠庢偍鐨勬湰鍦拌祫浜т腑鎻愬彇鍒癠ID锛岃鍘婚挶杩归噷鏂板缓涓€涓祫浜ф垨鍒嗙被鍚庡啀璇曪紒" }) } });
        return;
    }

    // 閫傞厤鐜版湁鐨勪簯绔В鏋愮粨鏋勶紝骞跺ぇ骞呯缉鍑忎綋绉槻 OOM
    const formattedAssets = assets.map(a => [a.name, a.id]);
    const formattedCategories = categories.map(cat => {
        // 鍏煎閽辫抗鐨勫瓙鍒嗙被瀛楁鍚嶏紙鍙兘鍙?childList, childs 绛夛級
        let subCats = cat.childList || cat.subList || cat.childs || cat.subs || [];
        return {
            id: cat.id,
            name: cat.name,
            type: cat.type,
            subs: subCats.map(sub => sub.name || sub)
        };
    });

    // 2. 鍙戝線 Cloudflare 鑷繁鐨?AI 杩涜瑙ｆ瀽
    const aiApiUrl = "https://qianji.renflyp.dpdns.org/";

    const cfRequest = {
        url: aiApiUrl,
        headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" 
        },
        body: JSON.stringify({
            text: sourceText,
            assets: formattedAssets,
            categories: formattedCategories,
            uid: qianjiUid,
            auth_headers: authHeaders
        })
    };

    $httpClient.post(cfRequest, function(err, resp, data) {
        if (err || !data) {
            console.log("璋冪敤浜戠瑙ｆ瀽澶辫触锛? + JSON.stringify(err || "鏃犳暟鎹繑鍥?));
            $done({ response: { status: 500, body: JSON.stringify({ error: "璋冪敤 CF 浜戠缃戠粶澶辫触", details: err }) } });
            return;
        }

        // 鎭㈠鍚屾閫忎紶妯″紡锛屽皢浜戠鐨?302 閲嶅畾鍚戠粨鏋滅洿鎺ヨ繑鍥炵粰蹇嵎鎸囦护
        console.log("CF 浜戠瑙ｆ瀽瀹屾垚锛岀姸鎬佺爜: " + resp.status);
        $done({ response: { status: resp.status, headers: resp.headers, body: data } });
    });
} else {
    $done({});
}

