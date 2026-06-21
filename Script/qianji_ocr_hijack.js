/**
 * 钱迹官方 OCR 接口劫持脚本
 * 拦截发往 api.qianjiapp.com/emmav2/ocr2bill 的请求，
 * 将文本转发至自建 Worker 解析，并将结果伪装为官方 JSON 返回，以完美激活原生快捷指令的浮窗确认记账。
 */

const workerUrl = "https://qianji.renflyp.dpdns.org/parse";
const workerToken = "qj_auto_bill_secret_key";

function main() {
    let reqBody;
    try {
        reqBody = JSON.parse($request.body);
    } catch (e) {
        console.log("解析请求体失败: " + e);
        $done({});
        return;
    }

    // 容错读取请求体中的文本字段
    const ocrText = reqBody.text || reqBody.content || reqBody.ocrText || reqBody.ocr_text || reqBody.raw_text || "";

    if (!ocrText) {
        console.log("未在请求体中提取到有效的 OCR 文本");
        $done({});
        return;
    }

    // 转发请求至自建的 Cloudflare Worker 进行解析
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
            console.log("调用自建解析接口失败: " + (error || response.status));
            $done({});
            return;
        }

        try {
            const resObj = JSON.parse(data);
            if (resObj.success && resObj.data) {
                const parseData = resObj.data;

                // 按照钱迹官方 `/emmav2/ocr2bill` 格式伪造 JSON 返回体
                const fakeResponse = {
                    amount: parseData.money || 0,
                    remark: parseData.remark || "未识别商户",
                    remainingQuota: 9999,
                    requestId: "hijack_" + Math.random().toString(36).substring(2, 15),
                    billType: {
                        confi: 0.99,
                        value: parseData.type === 1 ? "income" : "expense" // 1为收入，0/其它为支出
                    },
                    time: parseData.time || new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                    category_name: "其它" // 默认设为“其它”，可跳转确认弹窗里手动改
                };

                console.log("劫持伪造成功: " + JSON.stringify(fakeResponse));
                
                // 返回伪造的成功响应给客户端
                $done({
                    response: {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(fakeResponse)
                    }
                });
            } else {
                console.log("解析服务返回失败标识: " + data);
                $done({});
            }
        } catch (e) {
            console.log("处理解析结果并伪造 JSON 失败: " + e);
            $done({});
        }
    });
}

main();
