/**
 * 钱迹 AI 自动记账请求劫持脚本 (Loon)
 * 作用：拦截钱迹对官方 AI 解析接口 (/emmav2/ocr2bill) 的请求，
 * 转发到自建的 AI 后端（如 Cloudflare Worker 等），
 * 绕过官方因 VIP 签名 (x-signature) 错误导致的拦截！
 * 
 * 作者：ykybl0037
 */

const url = ($request && $request.url) ? $request.url : "";

if (url.includes("/emmav2/ocr2bill")) {
    const customApiUrl = "https://qianji.renflyp.dpdns.org/parse";
    console.log("钱迹：检测到官方 AI 解析请求，正在劫持转发到自建后端...");

    const options = {
        url: customApiUrl,
        headers: {
            "Content-Type": "application/json"
        },
        body: $request.body
    };

    $httpClient.post(options, function(error, response, data) {
        if (error) {
            console.log("钱迹 AI 劫持请求失败：" + JSON.stringify(error));
            $done({});
        } else {
            console.log("钱迹 AI 劫持解析成功，完美返回 JSON 结果给官方通道！");
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
