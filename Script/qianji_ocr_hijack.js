/**
 * 钱迹 AI 自动记账请求劫持脚本 (Loon)
 * 作用：拦截钱迹对官方 AI 解析接口 (/emmav2/ocr2bill) 的请求，
 * 转发到自建的 AI 后端（如 Cloudflare Worker 等），
 * 绕过官方因 VIP 签名 (x-signature) 错误导致的拦截！
 * 
 * 作者：ykybl0015
 */

const url = $request.url;

if (url.includes("/emmav2/ocr2bill")) {
    // 这里填写你自己搭建的 AI 解析后端的地址
    const customApiUrl = "https://qianji.renflyp.dpdns.org/parse";
    
    console.log("钱迹：检测到 AI 解析请求，正在劫持转发到自建后端...");

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
            $done({}); // 若失败，放行原请求
        } else {
            console.log("钱迹 AI 劫持解析成功，返回伪造结果！");
            
            // 直接将自建后端的返回结果伪装成官方结果返回给 App
            $done({
                response: {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json; charset=utf-8"
                    },
                    body: data
                }
            });
        }
    });
} else {
    $done({});
}
