/**
 * 钱迹快捷指令云端代工脚本 (Loon)
 * 作用：绕过本地快捷指令的 VIP 限制与异常弹窗拦截，解决 Cloudflare 异地 IP 导致的 ec:8888 异常报错。
 * 原理：
 * 1. 拦截官方 API 自动抓取并更新本地 Token、资产列表和分类列表；
 * 2. 拦截虚拟请求 hijack_add_bill 返回凭证及配置信息，由快捷指令请求 CF Worker 进行无状态的 AI 解析；
 * 3. 拦截虚拟请求 auto_push_bill 接收 AI 解析结果，在本地进行模糊匹配并全新生成 reqidv2，最后通过 $httpClient 从手机本机 IP 直推钱迹云端。
 * 
 * 作者：ykybl0054
 */

const url = ($request && $request.url) ? $request.url : "";

// 随机生成 32 位 hex 的 reqidv2 避免重放风控
function generateReqId() {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

// ==========================================
// 模块 1：被动抓取并更新身份凭证（运行在钱迹 App 内时）
// ==========================================
if (url.includes("api.qianjiapp.com") && 
    !url.includes("api.qianjiapp.com/hijack_add_bill") && 
    !url.includes("api.qianjiapp.com/auto_push_bill")) {
    
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
            // 返回凭证 JSON 给快捷指令
            const tokenPayload = {
                success: true,
                uid: qianjiUid,
                worker_url: "https://qianji.renflyp.dpdns.org",
                categories: categories,
                assets: assets
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

// ==========================================
// 模块 3：拦截快捷指令的推送请求，进行匹配并在本机推送
// ==========================================
else if (url.includes("api.qianjiapp.com/auto_push_bill")) {
    console.log("钱迹：收到本地直推请求，开始处理匹配与推送...");
    
    const headersStr = $persistentStore.read("qianji_auth_headers");
    const categoriesStr = $persistentStore.read("qianji_categories");
    const assetsStr = $persistentStore.read("qianji_assets");

    if (!headersStr) {
        $done({ 
            response: { 
                status: 500, 
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({ success: false, error: "缺失授权凭证" }) 
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
                    status: 500, 
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                    body: JSON.stringify({ success: false, error: "无法解析用户UID" }) 
                } 
            });
        } else {
            // 解析请求体中的 bill
            let reqBody = {};
            try {
                reqBody = JSON.parse($request.body || "{}");
            } catch(e) {
                console.log("钱迹：解析请求体失败: " + e.message);
            }

            const bill = reqBody.bill;
            if (!bill) {
                $done({ 
                    response: { 
                        status: 400, 
                        headers: { "Content-Type": "application/json; charset=utf-8" },
                        body: JSON.stringify({ success: false, error: "请求体内无账单数据" }) 
                    } 
                });
            } else {
                console.log("钱迹：待处理账单: " + JSON.stringify(bill));

                // 1. 资产模糊匹配
                let realAssetId = 0;
                if (assets.length > 0) {
                    let match = assets.find(a => a.name === bill.asset);
                    if (!match) {
                        match = assets.find(a => a.name.includes(bill.asset) || bill.asset.includes(a.name));
                    }
                    if (match) {
                        realAssetId = match.id;
                        console.log(`钱迹：资产 [${bill.asset}] 匹配成功 -> ${match.name} (ID: ${realAssetId})`);
                    } else {
                        console.log(`钱迹：资产 [${bill.asset}] 未匹配到，默认填 0`);
                    }
                }

                // 2. 分类模糊匹配
                let realCategoryId = 0;
                let realCateType = bill.type;
                if (categories.length > 0) {
                    let typedCats = categories.filter(c => c.type === bill.type);
                    let match = typedCats.find(c => c.name === bill.category);
                    if (!match) {
                        match = typedCats.find(c => {
                            if (c.name.includes(bill.category) || bill.category.includes(c.name)) return true;
                            if (c.subs && c.subs.length > 0) {
                                return c.subs.some(sub => {
                                    const subName = typeof sub === 'string' ? sub : (sub.name || "");
                                    return subName.includes(bill.category) || bill.category.includes(subName);
                                });
                            }
                            return false;
                        });
                    }
                    if (match) {
                        realCategoryId = match.id;
                        realCateType = match.type;
                        console.log(`钱迹：分类 [${bill.category}] 匹配成功 -> ${match.name} (ID: ${realCategoryId})`);
                    } else {
                        console.log(`钱迹：分类 [${bill.category}] 未匹配到，默认填 0`);
                    }
                }

                // 3. 时间与 ID 计算
                const timestampSeconds = Math.floor(Date.now() / 1000);
                let billTimeSecs = timestampSeconds;
                if (bill.time) {
                    const t = Date.parse(bill.time.replace(/-/g, '/'));
                    if (!isNaN(t)) billTimeSecs = Math.floor(t / 1000);
                }
                const fakeBillId = Date.now().toString();

                // 4. 组装 changelist
                const changeItem = {
                    "id": fakeBillId,
                    "userid": String(qianjiUid),
                    "bookid": -1,
                    "type": realCateType,
                    "remark": bill.remark || "自动记账",
                    "money": bill.money,
                    "createtime": timestampSeconds,
                    "updatetime": timestampSeconds,
                    "billtime": billTimeSecs,
                    "categoryname": bill.category,
                    "categoryid": realCategoryId,
                    "cate_type": realCateType,
                    "category_type": 0,
                    "assetid": realAssetId,
                    "status": 0,
                    "extra": {"baoxiaoed":0,"baoxiaotime":0,"baoxiaov":-1.0,"transfee":0.0,"tags":null},
                    "fromact": null,
                    "targetact": null,
                    "packid": -1,
                    "platform": 0,
                    "username": null,
                    "bookname": null,
                    "images": null
                };

                const vStr = JSON.stringify({
                    bills: {
                        changelist: JSON.stringify([changeItem])
                    }
                });

                const formBody = "uid=" + encodeURIComponent(qianjiUid) + "&fr=" + encodeURIComponent(qianjiUid) + "&v=" + encodeURIComponent(vStr);

                // 5. 组装新请求头并注入 reqidv2
                const reqHeaders = JSON.parse(JSON.stringify(authHeaders));
                reqHeaders["reqidv2"] = generateReqId();
                if (reqHeaders["Reqidv2"]) reqHeaders["Reqidv2"] = reqHeaders["reqidv2"];
                
                delete reqHeaders["Content-Length"];
                delete reqHeaders["content-length"];
                delete reqHeaders["Host"];
                delete reqHeaders["host"];
                reqHeaders["Content-Type"] = "application/x-www-form-urlencoded";

                console.log("钱迹：开始发送 syncall 到官方云端，新 reqidv2 为: " + reqHeaders["reqidv2"]);

                $httpClient.post({
                    url: "https://api.qianjiapp.com/bill/syncall",
                    headers: reqHeaders,
                    body: formBody
                }, function(error, response, data) {
                    if (error) {
                        console.log("钱迹：本机直推云端网络错误: " + JSON.stringify(error));
                        $done({
                            response: {
                                status: 500,
                                headers: { "Content-Type": "application/json; charset=utf-8" },
                                body: JSON.stringify({ success: false, error: error })
                            }
                        });
                    } else {
                        console.log("钱迹：本机直推云端成功返回: " + data);
                        $done({
                            response: {
                                status: response.status || 200,
                                headers: { "Content-Type": "application/json; charset=utf-8" },
                                body: data
                            }
                        });
                    }
                });
            }
        }
    }
} else {
    $done({});
}
