/**
 * 华为运动健康 GT5 个人表盘与 VIP 会员表盘解锁脚本
 * 作者: ykybl0001
 * 版本: 1.1.0
 * 
 * 功能:
 * 1. 解锁个人/自定义表盘权限 (personalWatchface)
 * 2. 解锁表盘会员订阅状态 (memberStatus = 1, validDate = 2099)
 * 3. 将收费表盘列表价格全量修改为 0.00 / 免费 (isFree, feeType = 0)
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
    
    // 1. 会员状态修改
    if (lowerKey === 'memberstatus') {
      console.log(`[HWWatchFace] 👑 修改会员状态 ${currentPath}: ${value} → "1"`);
      obj[key] = '1';
      continue;
    }
    if (lowerKey === 'hadrenewvip') {
      obj[key] = '1';
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
// 🚀 主逻辑
// ============================================================

let body = $response.body;
console.log(`[HWWatchFace] 拦截请求: ${url}`);

try {
  let obj = JSON.parse(body);
  
  // 专项接口1：会员订阅 API
  if (url.includes('/subscription/queryall')) {
    console.log(`[HWWatchFace] 👑 触发表盘会员订阅 API 锁定强改`);
    obj.resultcode = "00000";
    obj.resultinfo = "success.";
    obj.memberStatus = "1"; // 有效会员
    obj.hadRenewVip = "1";
    obj.expiredReminder = 0;
    if (!obj.subInfo) obj.subInfo = {};
    obj.subInfo.startDate = "2024-01-01 00:00:00";
    obj.subInfo.validDate = "2099-12-31 23:59:59";
    obj.subInfo.renewFlag = "1";
    if (obj.subInfo.productInfo) {
      obj.subInfo.productInfo.price = "0.00";
      obj.subInfo.productInfo.canRenewFlag = "1";
    }
  }
  
  // 专项接口2：表盘/主题列表 API
  if (url.includes('getThemeList.do') || url.includes('getMenu.do')) {
    console.log(`[HWWatchFace] ⌚ 触发表盘列表价格修改`);
    if (Array.isArray(obj.list)) {
      obj.list.forEach(item => {
        item.price = "0.00";
        item.discountPrice = "0.00";
        item.isFree = 1;
        item.isVipFree = 1;
        item.feeType = "0";
        item.priceType = "0";
        item.freeForVip = 1;
        item.vipFree = true;
      });
    }
  }
  
  // 通用深度遍历解锁
  obj = deepUnlock(obj);
  obj = fixDeviceList(obj);
  
  body = JSON.stringify(obj);
  console.log(`[HWWatchFace] ✅ 处理成功`);
  
} catch (e) {
  // 如果不是普通 JSON，尝试 Base64 解码后再处理
  try {
    const rawStr = $response.body;
    // 保护可能被 base64 包装的数据
    if (rawStr && !rawStr.startsWith('{') && !rawStr.startsWith('[')) {
      // 不做破坏性强改，记录日志
      console.log(`[HWWatchFace] ℹ️ 非 JSON 标准串或加密串，保留原始响应`);
    }
  } catch (err) {}
}

$done({ body: body });
