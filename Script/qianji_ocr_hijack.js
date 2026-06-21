/**
 * 钱迹官方 OCR 接口劫持脚本
 * Author: Antigravity_V1.1
 * 
 * 强力兼容各种请求体（JSON / urlencoded / 纯文本），防止解析报错退化到离线模式。
 */

const workerUrl = "https://qianji.renflyp.dpdns.org/parse";
const workerToken = "qj_auto_bill_secret_key";

function main() {
    let ocrText = "";
    const bodyStr = $request.body;

    console.log("收到拦截请求 Body: " + bodyStr);

    if (bodyStr) {
        // 1. 尝试作为 JSON 解析
        try {
            const reqBody = JSON.parse(bodyStr);
            ocrText = reqBody.text || reqBody.content || reqBody.ocrText || reqBody.ocr_text || reqBody.raw_text || "";
        } catch (e) {
            // 2. 尝试作为 URL-encoded 解析
            if (bodyStr.includes("=") && (bodyStr.includes("ocrText") || bodyStr.includes("text"))) {
                try {
                    const params = {};
                    bodyStr.split('&').forEach(param => {
                        const parts = param.split('=');
                        if (parts[0]) {
                            params[parts[0]] = decodeURIComponent(parts[1] || "");
                        }
                    });
                    ocrText = params.ocrText || params.text || params.content || "";
                } catch (err) {
                    ocrText = bodyStr;
                }
            } else {
                // 3. 直接当作 raw 纯文本处理
                ocrText = bodyStr;
            }
        }
    }

    // 清洗提取出来的 ocrText 前后的多余空白
    ocrText = ocrText.trim();

    if (!ocrText) {
        console.log("未提取到有效的交易通知文本");
        $done({});
        return;
    }

    console.log("提取交易文本成功: " + ocrText);

    // 转发请求至自建的 Cloudflare Worker 接口
    const options = {
        url: workerUrl,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${workerToken}`
        },
        body: JSON.stringify({ text: ocrText })
    };

    $httpClient.post(options, function(error, response, data) {
        if (error || response.status !== 200) {
            console.log("自建解析接口调用失败: " + (error || response.status));
            $done({});
            return;
        }

        try {
            const resObj = JSON.parse(data);
            if (resObj.success && resObj.data) {
                const parseData = resObj.data;

                // 伪造官方接口返回值
                const fakeResponse = {
                    amount: parseData.money || 0,
                    remark: parseData.remark || "未识别商户",
                    remainingQuota: 9999,
                    requestId: "hijack_" + Math.random().toString(36).substring(2, 15),
                    billType: {
                        confi: 0.99,
                        value: parseData.type === 1 ? "income" : "expense"
                    },
                    time: parseData.time || new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                    category_name: "其它"
                };

                console.log("伪造数据返回成功: " + JSON.stringify(fakeResponse));

                $done({
                    response: {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(fakeResponse)
                    }
                });
            } else {
                console.log("接口返回格式不符或带有失败标识: " + data);
                $done({});
            }
        } catch (err) {
            console.log("伪造 JSON 返回体失败: " + err);
            $done({});
        }
    });
}

main();
