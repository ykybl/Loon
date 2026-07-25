/**
 * 华为运动健康 GT5 个人表盘与 VIP 会员全量表盘解锁脚本
 * 作者: ykybl0003
 * 版本: 1.4.0
 * 
 * 功能:
 * 1. 深度锁定 VIP 会员订阅 (memberStatus = "1", renewFlag = "1", validDate = 2099)
 * 2. 解锁个人/自定义表盘权限 (personalWatchface = true)
 * 3. 拦截全量付费表盘列表，将价格修改为 0.00，免费类型设为通用免费 (contentPrivType = "1", feeType = "0")
 * 4. 拦截下单与支付 API (OrderAdd)，直接伪造支付成功响应
 */

const url = $request.url;

// GT5 及主流设备型号映射
const GT5_MODELS = ['GT5', 'WATCH-GT5', 'HarmonyOS Watch GT 5', 'GT5-46mm', 'GT5-42mm', 'VLI-B19'];

/**
 * 深度递归解锁 JSON 对象
 */
function deepUnlock(obj, path = '') {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map((item, i) => deepUnlock(item, `${path}[${i}]`));
  }
  
  for (const key of Object.keys(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const value = obj[key];
    
    // 递归处理嵌套对象
    if (value !== null && typeof value === 'object') {
      obj[key] = deepUnlock(value, currentPath);
      continue;
    }
    
    const lowerKey = key.toLowerCase();
    
    // 1. 会员状态强改
    if (lowerKey === 'memberstatus') {
      console.log(`[HWWatchFace] 👑 修改会员状态 ${currentPath}: ${value} → "1"`);
      obj[key] = '1';
      continue;
    }
    if (lowerKey === 'hadrenewvip' || lowerKey === 'isvip' || lowerKey === 'vipstatus') {
      obj[key] = typeof value === 'boolean' ? true : (typeof value === 'number' ? 1 : '1');
      continue;
    }
    
    // 2. 价格修改 (收费表盘转免费)
    if (lowerKey === 'price' || lowerKey === 'discountprice' || lowerKey === 'renewprice') {
      if (typeof value === 'string' && value !== '0.00') {
        console.log(`[HWWatchFace] 💰 价格修改 ${currentPath}: ${value} → "0.00"`);
        obj[key] = '0.00';
      }
      continue;
    }
    if (lowerKey === 'feetype' || lowerKey === 'pricetype') {
      obj[key] = '0';
      continue;
    }
    if (lowerKey === 'isfree' || lowerKey === 'isvipfree' || lowerKey === 'freeforvip' || lowerKey === 'vipfree') {
      if (value === 0 || value === false || value === '0' || value === 'false') {
        console.log(`[HWWatchFace] 🆓 免费标识修改 ${currentPath}: ${value} → true/1`);
        obj[key] = typeof value === 'number' ? 1 : (typeof value === 'string' ? '1' : true);
      }
      continue;
    }
    
    // 3. 个人/自定义表盘权限字段修改
    const isPermissionKey = 
      lowerKey.includes('personal') ||
      lowerKey.includes('watchface') ||
      lowerKey.includes('custom') ||
      lowerKey.includes('privilege') ||
      lowerKey.includes('entitle') ||
      lowerKey.includes('allow') ||
      lowerKey.includes('enable') ||
      lowerKey.includes('support');
    
    if (isPermissionKey) {
      if (value === false) {
        console.log(`[HWWatchFace] 🔓 解锁布尔权限 ${currentPath}: false → true`);
        obj[key] = true;
      } else if (value === 0 && (lowerKey.includes('allow') || lowerKey.includes('enable') || lowerKey.includes('support'))) {
        console.log(`[HWWatchFace] 🔓 解锁数字权限 ${currentPath}: 0 → 1`);
        obj[key] = 1;
      } else if (typeof value === 'string' && ['false', 'disabled', 'unsupported'].includes(value.toLowerCase())) {
        console.log(`[HWWatchFace] 🔓 解锁字符串权限 ${currentPath}: "${value}" → "true"`);
        obj[key] = 'true';
      }
    }
  }
  
  return obj;
}

/**
 * 针对设备白名单修复
 */
function fixDeviceList(obj) {
  const str = JSON.stringify(obj);
  if (str.includes('deviceList') || str.includes('supportedDevices') || str.includes('deviceType')) {
    for (const key of Object.keys(obj)) {
      if (['deviceList', 'supportedDevices', 'supportDevices', 'deviceTypes'].includes(key)) {
        if (Array.isArray(obj[key]) && !obj[key].some(d => GT5_MODELS.some(m => String(d).includes(m)))) {
          obj[key].push(...GT5_MODELS);
          console.log(`[HWWatchFace] 📱 已将 GT5 注入设备支持列表`);
        }
      }
    }
  }
  return obj;
}

// ============================================================
// 🚀 主逻辑入口
// ============================================================

let body = $response.body;
console.log(`[HWWatchFace] 拦截请求: ${url}`);

// 简单的 Base64 工具，防止 Loon 缺少 atob/btoa 或遇到中文乱码
const B64 = {
  decode: function(s) {
    if (typeof atob === 'function') return decodeURIComponent(escape(atob(s)));
    // fallback 简单实现
    return s; // 如果没有 atob 可能会失败，但 Loon 环境通常支持 atob
  },
  encode: function(s) {
    if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(s)));
    return s;
  }
};

let isBase64 = false;

try {
  let obj = null;
  // 判断是否是 base64
  if (body && !body.trim().startsWith('{') && !body.trim().startsWith('[')) {
    try {
      body = B64.decode(body.trim());
      isBase64 = true;
      console.log(`[HWWatchFace] 识别到 Base64 响应并解码成功`);
    } catch (e) {
      console.log(`[HWWatchFace] Base64 解码失败: ${e}`);
    }
  }

  obj = JSON.parse(body);
  
  // 专项 1：表盘 VIP 会员订阅 API 强改 (修复产品 ID 被覆盖导致前端无法识别的问题)
  if (url.includes('/subscription/queryall')) {
    console.log(`[HWWatchFace] 👑 触发 VIP 订阅 API 强改 (queryall)`);
    obj.resultcode = "00000";
    obj.resultCode = "00000";
    obj.resultinfo = "success.";
    obj.memberStatus = "1"; // ACTIVE_VIP (1 为有效会员)
    obj.hadRenewVip = "1";
    obj.isVip = "1";
    obj.vipStatus = "1";
    obj.expiredReminder = 0;
    obj.isYoung = "0";
    obj.isRecycling = "0";
    
    const farDate = "2099-12-31 23:59:59";
    const startDate = "2024-01-01 00:00:00";
    
    // 如果用户从来没开过会员，subInfo 可能是 undefined，必须强制初始化
    if (!obj.subInfo) obj.subInfo = {};
    if (!obj.subInfo.productInfo) obj.subInfo.productInfo = {};
    
    obj.subInfo.startDate = startDate;
    obj.subInfo.validDate = farDate;
    obj.subInfo.renewFlag = "1";
    obj.subInfo.nextRenewTime = farDate;
    
    if (!obj.subInfo.productInfo.productCode) obj.subInfo.productInfo.productCode = "20250721200728"; // 注入抓包里的标准年卡ID
    obj.subInfo.productInfo.price = "0.00";
    obj.subInfo.productInfo.validDay = "36500";
    obj.subInfo.productInfo.canRenewFlag = "1";
    obj.subInfo.productInfo.discountPrice = "0.00";
    obj.subInfo.productInfo.userType = "2"; // 2 = YEAR
    obj.subInfo.productInfo.productType = "2";
    
    if (!obj.renewInfo) obj.renewInfo = {};
    if (!obj.renewInfo.productInfo) obj.renewInfo.productInfo = {};
    
    obj.renewInfo.startDate = startDate;
    obj.renewInfo.validDate = farDate;
    obj.renewInfo.renewFlag = "1";
    obj.renewInfo.nextRenewTime = farDate;
    
    if (!obj.renewInfo.productInfo.productCode) obj.renewInfo.productInfo.productCode = "20250721200728";
    obj.renewInfo.productInfo.price = "0.00";
    obj.renewInfo.productInfo.validDay = "36500";
    obj.renewInfo.productInfo.canRenewFlag = "1";
    obj.renewInfo.productInfo.userType = "2";
    obj.renewInfo.productInfo.productType = "2";
  }
  
  // 专项 2：表盘与主题列表、详情、过滤 API
  if (url.includes('getThemeList') || url.includes('getMenu') || url.includes('getTrialList') || url.includes('getFilterResult') || url.includes('getDetailResourceInfo') || url.includes('querybytype') || url.includes('memberproduct/list')) {
    console.log(`[HWWatchFace] ⌚ 触发表盘列表/详情价格全免费强改`);
    // 处理列表页
    if (Array.isArray(obj.list)) {
      obj.list.forEach(item => {
        item.price = "0.00";
        item.discountPrice = "0.00";
        item.renewPrice = "0.00";
        item.isFree = 1;
        item.isVipFree = 1;
        item.freeForVip = 1;
        item.vipFree = true;
        item.feeType = "0";
        item.priceType = "0";
        item.contentPrivType = "1";
        if (item.rightSubtitle1) item.rightSubtitle1 = "免费";
        if (item.rightSubtitle2) item.rightSubtitle2 = "免费";
      });
    }
    // 处理分类/VIP商品页 (productInfoList)
    if (Array.isArray(obj.productInfoList)) {
      obj.productInfoList.forEach(item => {
        item.price = "0.00";
        item.discountPrice = "0.00";
        item.userType = "1";
      });
    }
  }

  // 专项 3：下单/购买 API 拦截 (OrderAdd)
  if (url.includes('order/add') || url.includes('OrderAdd')) {
    console.log(`[HWWatchFace] 💳 触发下单支付拦截伪造`);
    obj.resultCode = "0";
    obj.resultcode = "0";
    obj.returnCode = "0";
    obj.orderId = "8888888888888888";
    obj.isVipOrder = true;
    obj.payStatus = 1;
  }
  
  // 专项 4：下载鉴权拦截 (downloadinfo/query 返回的是 base64 编码的 json)
  if (url.includes('/downloadinfo/query')) {
    console.log(`[HWWatchFace] ⬇️ 触发下载鉴权拦截`);
    obj.resultcode = 0; // 必须是 0 成功
    obj.resultinfo = "success";
    obj.isOrdered = 1;
    obj.subscriptionStatus = 1;
    obj.memberStatus = "1";
  }
  
  // 通用深度递归解锁
  obj = deepUnlock(obj);
  obj = fixDeviceList(obj);
  
  body = JSON.stringify(obj);
  
  if (isBase64) {
    console.log(`[HWWatchFace] 重新进行 Base64 编码`);
    body = B64.encode(body);
  }
  
  console.log(`[HWWatchFace] ✅ 处理成功`);
  
} catch (e) {
  console.log(`[HWWatchFace] ❌ 处理异常: ${e}`);
  // 如果无法解析，保留原样
}

$done({ body: body });
