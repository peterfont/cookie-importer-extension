/**
 * 解析cookie字符串为对象
 * @param {string} cookieString - cookie字符串
 * @returns {Object} - 包含cookie名称和值的对象
 */
function parseCookies(cookieString) {
    const cookies = {};
    const cookieArray = cookieString.split('; ');

    cookieArray.forEach(cookie => {
        const [name, value] = cookie.split('=');
        if (name) {
            cookies[decodeURIComponent(name)] = decodeURIComponent(value || '');
        }
    });

    return cookies;
}

/**
 * 将cookie对象导入到document.cookie
 * @param {Object} cookies - cookie对象
 */
function importCookies(cookies) {
    for (const [name, value] of Object.entries(cookies)) {
        document.cookie = `${name}=${value}; path=/`;
    }
}

/**
 * 解析Netscape格式的cookie文件
 * @param {string} fileContent - cookie文件内容
 * @returns {Array} - cookie对象数组
 */
function parseNetscapeCookies(fileContent) {
  const cookies = [];
  // 按行分割
  const lines = fileContent.trim().split('\n');
  
  // 遍历每一行
  lines.forEach(line => {
    // 忽略空行、注释行或带有文件路径的行
    if (!line || line.startsWith('#') || line.startsWith('//')) return;
    
    // 分割每行的字段
    const fields = line.split('\t');
    
    // Netscape格式通常有7个或更多字段
    if (fields.length >= 6) {
      const cookie = {
        domain: fields[0],
        httpOnly: fields[1].toUpperCase() === 'TRUE',
        path: fields[2],
        secure: fields[3].toUpperCase() === 'TRUE',
        expirationDate: parseInt(fields[4]),
        name: fields[5],
        value: fields.length > 6 ? fields[6] : ''
      };
      cookies.push(cookie);
    }
  });
  
  return cookies;
}

/**
 * 检查是否可以导入指定的cookie
 * @param {Object} cookie - cookie对象
 * @returns {boolean} - 是否可以导入
 */
function canImportCookie(cookie) {
  // 检查cookie是否有必要的字段
  return (
    cookie.domain && 
    cookie.name && 
    cookie.path !== undefined &&
    cookie.expirationDate !== undefined
  );
}

/**
 * 格式化cookie以符合chrome.cookies.set的格式
 * 处理特殊的安全前缀Cookie，如__Host-和__Secure-
 * @param {Object} cookie - cookie对象
 * @returns {Object} - 格式化后的cookie对象
 */
function formatCookieForImport(cookie) {
  // 判断是否为特殊前缀的Cookie
  const isHostPrefixed = cookie.name.startsWith('__Host-');
  const isSecurePrefixed = cookie.name.startsWith('__Secure-');
  
  // 构建URL - 对所有安全前缀的Cookie强制使用HTTPS
  const protocol = (isHostPrefixed || isSecurePrefixed || cookie.secure) ? 'https://' : 'http://';
  const host = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
  const url = `${protocol}${host}${cookie.path}`;
  
  // 准备Cookie对象
  const formattedCookie = {
    url: url,
    name: cookie.name,
    value: cookie.value,
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    expirationDate: cookie.expirationDate,
    storeId: "0" // 默认cookie store
  };
  
  // 处理Domain属性
  // 对于__Host-前缀的Cookie，不设置domain属性（Chrome会使用URL的主机名）
  if (!isHostPrefixed) {
    // 只有当域名以点开始时才设置domain，否则使用URL中的主机名
    if (cookie.domain.startsWith('.')) {
      formattedCookie.domain = cookie.domain;
    }
  }
  
  // 处理安全标志
  // 对于__Host-和__Secure-前缀的Cookie，必须设置secure为true
  if (isHostPrefixed || isSecurePrefixed) {
    formattedCookie.secure = true;
  } else {
    formattedCookie.secure = cookie.secure;
  }
  
  return formattedCookie;
}

// 统一导出所有函数
export { 
  parseCookies, 
  importCookies, 
  parseNetscapeCookies, 
  canImportCookie, 
  formatCookieForImport 
};