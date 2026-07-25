/**
 * 华为运动健康 GT5 个人表盘与 VIP 会员全量表盘解锁脚本
 * 作者: ykybl0004
 * 版本: 2.0.0
 *
 * 核心设计:
 * 1. 所有华为主题/表盘 API 响应均可能是 Base64 编码的 JSON，先解码
 * 2. 针对具体 API 精准修改字段，不依赖递归通用函数（避免误改）
 * 3. 修改完成后，根据原来是否 Base64 决定是否重新编码
 */

const url = $request.url;
console.log(`[HWWatchFace v2] 拦截: ${url}`);

// ── 工具函数 ──────────────────────────────────────────────────────────────────

/**
 * 安全解码 Base64（支持中文 UTF-8）
 */
function safeB64Decode(s) {
  try {
    // Loon 环境：atob 处理纯 ASCII Base64，中文需要 escape 解码
    const decoded = atob(s.replace(/\s+/g, ''));
    try {
      return decodeURIComponent(escape(decoded));
    } catch (_) {
      return decoded;
    }
  } catch (e) {
    console.log(`[HWWatchFace v2] Base64解码失败: ${e}`);
    return null;
  }
}

/**
 * 安全编码 Base64（支持中文 UTF-8）
 */
function safeB64Encode(s) {
  try {
    return btoa(unescape(encodeURIComponent(s)));
  } catch (e) {
    try {
      return btoa(s);
    } catch (_) {
      return s;
    }
  }
}

/**
 * 尝试将 body 解析为 JSON 对象，自动处理 Base64 情况
 * 返回 { obj, isBase64 }
 */
function parseBody(body) {
  if (!body || body.trim().length === 0) return { obj: null, isBase64: false };

  const trimmed = body.trim();

  // 直接尝试 JSON 解析
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return { obj: JSON.parse(trimmed), isBase64: false };
    } catch (_) {}
  }

  // 尝试 Base64 解码后再解析
  const decoded = safeB64Decode(trimmed);
  if (decoded) {
    try {
      const obj = JSON.parse(decoded);
      console.log(`[HWWatchFace v2] ✅ 识别 Base64 响应，解码成功`);
      return { obj, isBase64: true };
    } catch (_) {}
  }

  return { obj: null, isBase64: false };
}

// ── 主逻辑 ───────────────────────────────────────────────────────────────────

let body = $response.body;
const { obj, isBase64 } = parseBody(body);

if (!obj) {
  console.log(`[HWWatchFace v2] ⚠️ 无法解析响应体，原样放行`);
  $done({ body });
  return; // 必须 return 防止后续代码继续执行
}

// ── 专项 1：VIP 会员订阅接口 (/subscription/queryall) ──────────────────────
if (url.includes('/subscription/queryall')) {
  console.log(`[HWWatchFace v2] 👑 处理 VIP 订阅接口`);

  const FAR  = '2099-12-31 23:59:59';
  const START = '2024-01-01 00:00:00';

  // 顶层字段
  obj.resultcode     = '00000';
  obj.resultinfo     = 'success.';
  obj.memberStatus   = '1';   // ACTIVE_VIP
  obj.hadRenewVip    = '1';
  obj.expiredReminder = 0;
  obj.isYoung        = '0';
  obj.isRecycling    = '0';

  // subInfo —— 确保存在并且有效期在未来
  if (!obj.subInfo) obj.subInfo = {};
  obj.subInfo.validDate    = FAR;
  obj.subInfo.startDate    = obj.subInfo.startDate || START;
  obj.subInfo.renewFlag    = '1';
  obj.subInfo.nextRenewTime = FAR;
  obj.subInfo.currentDate  = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (!obj.subInfo.productInfo) obj.subInfo.productInfo = {};
  const sp = obj.subInfo.productInfo;
  if (!sp.productCode) sp.productCode = '20250516094719'; // 用抓包里实际存在的 productCode
  sp.validDay       = '36500';
  sp.renewFlag      = '1';
  sp.canRenewFlag   = '1';
  sp.price          = '0.00';
  sp.discountPrice  = '0.00';
  sp.productType    = '2';
  sp.userType       = '1'; // 月费类型 = 1，年费 = 2

  // renewInfo —— 同上
  if (!obj.renewInfo) obj.renewInfo = {};
  obj.renewInfo.validDate     = FAR;
  obj.renewInfo.startDate     = obj.renewInfo.startDate || START;
  obj.renewInfo.renewFlag     = '1';
  obj.renewInfo.nextRenewTime = FAR;
  obj.renewInfo.currentDate   = obj.subInfo.currentDate;

  if (!obj.renewInfo.productInfo) obj.renewInfo.productInfo = {};
  const rp = obj.renewInfo.productInfo;
  if (!rp.productCode) rp.productCode = '20240819102646';
  rp.validDay     = '36500';
  rp.renewFlag    = '1';
  rp.canRenewFlag = '1';
  rp.price        = '0.00';
  rp.discountPrice = '0.00';
  rp.renewPrice   = '0.00';
  rp.productType  = '2';
  rp.userType     = '1';
}

// ── 专项 2：表盘/主题列表和详情接口 ─────────────────────────────────────────
const isDialListOrDetail =
  url.includes('getThemeList') ||
  url.includes('getMenu') ||
  url.includes('getTrialList') ||
  url.includes('getFilterResult') ||
  url.includes('getDetailResourceInfo') ||
  url.includes('querybytype') ||
  url.includes('memberproduct/list') ||
  url.includes('getOpenAdvertisement');

if (isDialListOrDetail) {
  console.log(`[HWWatchFace v2] ⌚ 处理表盘列表/详情`);

  const unlockItem = (item) => {
    if (!item || typeof item !== 'object') return;
    item.price         = '0.00';
    item.discountPrice = '0.00';
    if ('renewPrice'   in item) item.renewPrice   = '0.00';
    if ('originPrice'  in item) item.originPrice  = '0.00';
    if ('isFree'       in item) item.isFree       = 1;
    if ('feeType'      in item) item.feeType      = '0';
    if ('priceType'    in item) item.priceType    = '0';
    if ('contentPrivType' in item) item.contentPrivType = '1';
    // 不修改 userType 和 isVipFree，让 VIP 正常显示
  };

  if (Array.isArray(obj.list)) obj.list.forEach(unlockItem);
  if (Array.isArray(obj.productInfoList)) obj.productInfoList.forEach(unlockItem);
  if (obj.detail) unlockItem(obj.detail);
  if (obj.resourceInfo) unlockItem(obj.resourceInfo);
}

// ── 专项 3：下载鉴权接口 (/downloadinfo/query) ───────────────────────────────
if (url.includes('downloadinfo/query') || url.includes('DownloadInfo/query')) {
  console.log(`[HWWatchFace v2] ⬇️ 处理下载鉴权`);
  obj.resultcode        = 0;           // 整数 0 = 成功
  obj.resultinfo        = 'success';
  obj.isOrdered         = 1;
  obj.subscriptionStatus = 1;
  obj.memberStatus      = '1';
  if ('canDownload' in obj) obj.canDownload = 1;
  if ('hasRight'    in obj) obj.hasRight    = 1;
}

// ── 专项 4：下单/购买接口 (order/add) ────────────────────────────────────────
if (url.includes('order/add') || url.includes('OrderAdd')) {
  console.log(`[HWWatchFace v2] 💳 处理下单支付`);
  obj.resultCode  = '0';
  obj.resultcode  = '0';
  obj.returnCode  = '0';
  obj.orderId     = '8888888888888888';
  obj.isVipOrder  = true;
  obj.payStatus   = 1;
}

// ── 序列化并回写 ──────────────────────────────────────────────────────────────
let newBody = JSON.stringify(obj);

if (isBase64) {
  console.log(`[HWWatchFace v2] 🔁 重新 Base64 编码`);
  newBody = safeB64Encode(newBody);
}

console.log(`[HWWatchFace v2] ✅ 处理完成`);
$done({ body: newBody });
