import json

with open('Script/qianji_auto_shortcut.js', encoding='utf-8') as f:
    content = f.read()

parts = content.split('else if (url.includes("api.qianjiapp.com/hijack_add_bill")) {')

new_logic = """else if (url.includes("api.qianjiapp.com/hijack_add_bill")) {
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
"""

with open('Script/qianji_auto_shortcut.js', 'w', encoding='utf-8') as f:
    f.write(parts[0] + new_logic)
