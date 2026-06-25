/**
 * 钱迹快捷指令云端代工脚本 (Loon)
 * 作用：绕过本地快捷指令的 VIP 限制与异常弹窗死锁。
 * 原理：拦截自定义本地请求，调用 CF 云端大模型，然后使用保存的官方 Token 直接向钱迹服务器静默写入账单！
 * 
 * 作者：ykybl0034
 */

const url = ($request && $request.url) ? $request.url : "";

// ==========================================
// 模块 1：被动抓取并更新身份凭据（运行在钱迹 App 内时）
// ==========================================
if (url.includes("api.qianjiapp.com") && !url.includes("api.qianjiapp.com/hijack_add_bill")) {
    if (url.includes("/category/list") || url.includes("/asset/list") || url.includes("/syncv2/pull")) {
        // 保存全量请求头（包含授权信息）
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
                    console.log("钱迹：成功抓取并更新分类列表！");
                }
            } catch(e) {}
        } else if (url.includes("/asset/list")) {
            try {
                let obj = JSON.parse($response.body);
                if (obj.data && obj.data.list) {
                    $persistentStore.write(JSON.stringify(obj.data.list), "qianji_assets");
                    console.log("钱迹：成功抓取并更新资产列表！");
                }
            } catch(e) {}
        }
    }
    $done({});
}

// ==========================================
// 模块 2：拦截快捷指令的虚拟请求并代工执行
// ==========================================
else if (url.includes("api.qianjiapp.com/hijack_add_bill")) {
    console.log("钱迹：收到 iOS 快捷指令发来的 AI 记账请求！");
    
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
        $done({ response: { status: 400, body: JSON.stringify({ error: "请求体中未找到账单文本内容" }) } });
        return;
    }

    // 1. 读取保存的依赖数据
    const categoriesStr = $persistentStore.read("qianji_categories");
    const assetsStr = $persistentStore.read("qianji_assets");
    const headersStr = $persistentStore.read("qianji_auth_headers");

    if (!categoriesStr || !assetsStr || !headersStr) {
        $done({ response: { status: 400, body: JSON.stringify({ error: "缺失关键数据。请先打开一次钱迹 App，下拉刷新一次列表，以便脚本抓取凭证！" }) } });
        return;
    }

    const categories = JSON.parse(categoriesStr);
    const assets = JSON.parse(assetsStr);
    const authHeaders = JSON.parse(headersStr);

    // 绝杀：直接从已经保存的官方数据中提取真实的 userid！
    let qianjiUid = "";
    if (assets && assets.length > 0 && assets[0].userid) {
        qianjiUid = assets[0].userid;
    } else if (categories && categories.length > 0 && categories[0].userid) {
        qianjiUid = categories[0].userid;
    }

    if (!qianjiUid) {
        $done({ response: { status: 400, body: JSON.stringify({ error: "无法从您的本地资产中提取到UID，请去钱迹里新建一个资产或分类后再试！" }) } });
        return;
    }

    // 适配现有的云端解析结构，并大幅缩减体积防 OOM
    const formattedAssets = assets.map(a => [a.name, a.id]);
    const formattedCategories = categories.map(cat => {
        // 兼容钱迹的子分类字段名（可能叫 childList, childs 等）
        let subCats = cat.childList || cat.subList || cat.childs || cat.subs || [];
        return {
            id: cat.id,
            name: cat.name,
            type: cat.type,
            subs: subCats.map(sub => sub.name || sub)
        };
    });

    // 2. 发往 Cloudflare 自己的 AI 进行解析
    const aiApiUrl = "https://qianji.renflyp.dpdns.org/parse";
    const cfRequest = {
        url: aiApiUrl,
        // timeout: 60, // 移除脚本级 timeout 参数，防止 Loon 底层解析不支持导致抛出 null 错误
        headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" // 伪装合法 UA，防止 CF WAF 阻断
        },
        body: JSON.stringify({
            text: sourceText,
            assets: formattedAssets,
            categories: formattedCategories
        })
    };

    $httpClient.post(cfRequest, function(err, resp, data) {
        if (err || !data) {
            console.log("调用云端解析失败：" + JSON.stringify(err || "无数据返回"));
            $done({ response: { status: 500, body: JSON.stringify({ error: "调用 CF 云端大模型失败: " + JSON.stringify(err || "No data") }) } });
            return;
        }

        let parsedData;
        try {
            parsedData = JSON.parse(data);
        } catch (e) {
            $done({ response: { status: 500, body: JSON.stringify({ error: "云端返回数据非 JSON" }) } });
            return;
        }

        console.log("CF 云端解析成功，结果：" + JSON.stringify(parsedData));

        // 3. 构造原生写入请求推送到钱迹官方云端
        const timestampSeconds = Math.floor(Date.now() / 1000);
        // 生成虚假唯一 ID：缩短到 15 位以内，防止 JS Number 最大精度丢失引发服务端无法识别被拒
        const fakeBillId = Number(Date.now().toString() + Math.floor(Math.random() * 99).toString().padStart(2, '0'));

        // 查找真实 ID
        let realAssetId = 0;
        if (parsedData.firstAsset_idx !== undefined && assets[parsedData.firstAsset_idx]) {
            realAssetId = assets[parsedData.firstAsset_idx].id;
        }
        
        let realCategoryId = 0;
        let realCateType = 0;
        let isSubCategory = 0;
        
        if (parsedData.category_idx !== undefined && formattedCategories[parsedData.category_idx]) {
            const masterCat = formattedCategories[parsedData.category_idx];
            realCategoryId = masterCat.id;
            realCateType = masterCat.type; // 0支出, 1收入
            
            if (parsedData.sub_category_idx !== undefined && masterCat.subs && masterCat.subs[parsedData.sub_category_idx]) {
                // 如果需要可以获取子分类ID，但为了保险暂时不强制要求
            }
        }

        const qianjiInnerList = [{
            "id": fakeBillId,
            "userid": qianjiUid,
            "bookid": -1,
            "type": parsedData.billType && parsedData.billType.value === "income" ? 1 : 0,
            "remark": parsedData.remark || "快捷指令自动记账",
            "money": parseFloat(parsedData.amount) || 0,
            "status": 2, // 抓包中正常写入是 2
            "cateid": realCategoryId,
            "time": timestampSeconds,
            "createtime": timestampSeconds,
            "updatetime": timestampSeconds,
            "assetid": realAssetId,
            "fromid": -1,
            "targetid": -1,
            "category": null,
            "extra": {"baoxiaoed":0,"baoxiaotime":0,"baoxiaov":-1.0,"transfee":0.0,"tags":null},
            "fromact": null,
            "targetact": null,
            "packid": -1,
            "platform": 0,
            "username": null,
            "bookname": null,
            "images": null
        }];

        const vStr = JSON.stringify({
            bills: {
                changelist: JSON.stringify(qianjiInnerList)
            }
        });

        // 拼接为 x-www-form-urlencoded，同时带上必须的 uid 与 fr 字段
        const formBody = "uid=" + encodeURIComponent(qianjiUid) + "&fr=" + encodeURIComponent(qianjiUid) + "&v=" + encodeURIComponent(vStr);

        const pushReq = {
            url: "https://api.qianjiapp.com/bill/syncall",
            headers: authHeaders,
            body: formBody
        };
        
        // 覆盖一些可能导致校验失败的 Headers
        if (pushReq.headers["Content-Length"]) delete pushReq.headers["Content-Length"];
        if (pushReq.headers["content-length"]) delete pushReq.headers["content-length"];
        if (pushReq.headers["Content-Type"]) delete pushReq.headers["Content-Type"];
        if (pushReq.headers["content-type"]) delete pushReq.headers["content-type"];
        pushReq.headers["Content-Type"] = "application/x-www-form-urlencoded";

        $httpClient.post(pushReq, function(pushErr, pushResp, pushData) {
            if (pushErr) {
                $done({ response: { status: 500, body: JSON.stringify({ error: "推送官方云端失败", details: pushErr }) } });
                return;
            }
            console.log("成功原生推送到钱迹云端：" + pushData);
            
            // 严谨判断钱迹服务端的业务状态码，而不是掩耳盗铃
            let qianjiResp = null;
            try {
                qianjiResp = JSON.parse(pushData);
            } catch (e) {}

            if (qianjiResp && qianjiResp.ec === 0) {
                $done({ response: { status: 200, body: JSON.stringify({ success: true, message: "记账成功并已云同步！", data: qianjiResp }) } });
            } else {
                $done({ response: { status: 500, body: JSON.stringify({ error: "被钱迹服务器拒绝", cloudflare_parsed: parsedData, qianji_response: pushData, sent_payload: qianjiInnerList }) } });
            }
        });
    });
} else {
    $done({});
}
