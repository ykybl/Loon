/**
 * 华为运动健康 GT5 个人表盘权限解锁脚本
 * 作者: ykybl0001
 * 版本: 1.0.0 (待抓包验证后精确化)
 * 
 * ⚠️ 警告: 仅供个人学习研究使用
 * 
 * 使用说明:
 * 1. 先完成抓包，找到真实的权限 API URL
 * 2. 根据真实响应结构调整下方的 UNLOCK_RULES
 * 3. 修改 .plugin 文件中的 URL 匹配规则
 */

const url = $request.url;
const method = $request.method;

// ============================================================
// 🔧 配置区：根据抓包结果调整
// ============================================================

const UNLOCK_RULES = [
  // 规则1: 布尔值字段 false → true
  {
    type: 'boolean',
    paths: [
      'personalWatchface',
      'allowPersonalWatchFace', 
      'customWatchfaceEnabled',
      'watchFaceCustomEnabled',
      'enabled',
      'isEnable',
    ]
  },
  // 规则2: 数字字段 0 → 1
  {
    type: 'number',
    paths: [
      'allowPersonalWatchFace',
      'supportLevel',
      'featureSwitch',
    ]
  },
  // 规则3: 字符串字段 "false"/"disabled" → "true"/"enabled"
  {
    type: 'string',
    paths: [
      'status',
      'state',
    ],
    from: ['false', 'disabled', '0', 'no'],
    to: 'true'
  }
];

// GT5 设备型号映射（部分功能按设备型号限制）
const GT5_MODELS = ['GT5', 'WATCH-GT5', 'HarmonyOS Watch GT 5', 'GT5-46mm', 'GT5-42mm'];

// ============================================================
// 🔨 核心逻辑
// ============================================================

/**
 * 深度遍历并修改 JSON 对象中的权限字段
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
    
    // 检查是否是权限相关字段
    const lowerKey = key.toLowerCase();
    const isPermissionKey = 
      lowerKey.includes('personal') ||
      lowerKey.includes('watchface') ||
      lowerKey.includes('custom') ||
      lowerKey.includes('privilege') ||
      lowerKey.includes('entitle') ||
      lowerKey.includes('allow') ||
      lowerKey.includes('enable') ||
      lowerKey.includes('support');
    
    if (!isPermissionKey) continue;
    
    // 修改布尔 false → true
    if (value === false) {
      console.log(`[HWWatchFace] 🔓 解锁字段 ${currentPath}: false → true`);
      obj[key] = true;
    }
    // 修改数字 0 → 1 (但保护版本号等合理为0的字段)
    else if (value === 0 && (lowerKey.includes('allow') || lowerKey.includes('enable') || lowerKey.includes('support'))) {
      console.log(`[HWWatchFace] 🔓 解锁字段 ${currentPath}: 0 → 1`);
      obj[key] = 1;
    }
    // 修改字符串 "false"/"disabled" → "true"
    else if (typeof value === 'string' && ['false', 'disabled', 'unsupported'].includes(value.toLowerCase())) {
      console.log(`[HWWatchFace] 🔓 解锁字段 ${currentPath}: "${value}" → "true"`);
      obj[key] = 'true';
    }
  }
  
  return obj;
}

/**
 * 修复设备型号限制（如果功能按设备白名单控制）
 */
function fixDeviceList(obj) {
  const str = JSON.stringify(obj);
  // 如果响应中提到了设备型号限制，尝试将 GT5 加入支持列表
  if (str.includes('deviceList') || str.includes('supportedDevices') || str.includes('deviceType')) {
    for (const key of Object.keys(obj)) {
      if (['deviceList', 'supportedDevices', 'supportDevices', 'deviceTypes'].includes(key)) {
        if (Array.isArray(obj[key]) && !obj[key].some(d => GT5_MODELS.some(m => String(d).includes(m)))) {
          obj[key].push(...GT5_MODELS);
          console.log(`[HWWatchFace] 📱 已将 GT5 加入设备支持列表`);
        }
      }
    }
  }
  return obj;
}

// ============================================================
// 🚀 主入口
// ============================================================

let body = $response.body;

console.log(`[HWWatchFace] 拦截请求: ${url}`);

try {
  let obj = JSON.parse(body);
  
  // 打印原始响应前200字符（调试用）
  console.log(`[HWWatchFace] 原始响应: ${body.substring(0, 300)}`);
  
  // 执行解锁
  obj = deepUnlock(obj);
  obj = fixDeviceList(obj);
  
  body = JSON.stringify(obj);
  console.log(`[HWWatchFace] ✅ 处理完成`);
  
} catch (e) {
  console.log(`[HWWatchFace] ❌ JSON 解析失败: ${e.message}`);
  console.log(`[HWWatchFace] 原始响应: ${body.substring(0, 500)}`);
}

$done({ body: body });
