import { parseNetscapeCookies, canImportCookie, formatCookieForImport } from '../utils/cookie-parser.js';
import { saveData, getData } from '../utils/storage-helper.js';

// 跟踪导入进度
let importProgress = {
  total: 0,
  imported: 0,
  failed: 0,
  current: '',
  finished: false,  // 添加完成标志
  failedItems: []   // 添加失败项记录
};

// 导入单个cookie
function importSingleCookie(cookie) {
  return new Promise((resolve) => {
    importProgress.current = `${cookie.domain} - ${cookie.name}`;
    
    // 更新进度状态
    saveData('importProgress', importProgress);
    
    // 使用Chrome cookies API设置cookie
    chrome.cookies.set(cookie, (result) => {
      if (result) {
        importProgress.imported++;
        resolve(true);
      } else {
        importProgress.failed++;
        const error = chrome.runtime.lastError ? chrome.runtime.lastError.message : '未知错误';
        console.error(`Failed to set cookie: ${cookie.name} for ${cookie.domain}`, error);
        
        // 记录失败的Cookie
        importProgress.failedItems.push({
          domain: cookie.domain,
          name: cookie.name,
          error: error
        });
        
        resolve(false);
      }
    });
  });
}

// 批量导入cookies
async function importCookies(cookies) {
  importProgress = {
    total: cookies.length,
    imported: 0,
    failed: 0,
    current: '',
    finished: false,
    failedItems: []
  };
  
  // 保存导入进度以便popup可以显示
  await saveData('importProgress', importProgress);
  
  try {
    for (const rawCookie of cookies) {
      if (canImportCookie(rawCookie)) {
        const formattedCookie = formatCookieForImport(rawCookie);
        await importSingleCookie(formattedCookie);
      } else {
        importProgress.failed++;
        importProgress.failedItems.push({
          domain: rawCookie.domain || '未知域名',
          name: rawCookie.name || '未知名称',
          error: 'Cookie格式无效或缺少必要字段'
        });
      }
      
      // 每导入一个cookie更新进度
      await saveData('importProgress', importProgress);
    }
  } catch (error) {
    console.error('导入过程中发生错误:', error);
  } finally {
    // 无论成功失败都标记为已完成
    importProgress.finished = true;
    await saveData('importProgress', importProgress);
  }
  
  return importProgress;
}

// 处理从popup发来的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'parseAndImportCookies') {
    const fileContent = message.data;
    const cookies = parseNetscapeCookies(fileContent);
    
    // 立即返回以避免超时
    sendResponse({ success: true, started: true });
    
    // 执行导入操作
    importCookies(cookies);
    return false; // 不需要保持消息通道开启
  }
  
  if (message.action === 'getImportProgress') {
    getData('importProgress').then(progress => {
      sendResponse({ success: true, progress: progress });
    });
    return true; // 异步响应
  }
  
  if (message.action === 'resetImportProgress') {
    importProgress = {
      total: 0,
      imported: 0,
      failed: 0,
      current: '',
      finished: false,
      failedItems: []
    };
    saveData('importProgress', importProgress).then(() => {
      sendResponse({ success: true });
    });
    return true; // 异步响应
  }
});

// 初始化导入进度数据
saveData('importProgress', {
  total: 0,
  imported: 0,
  failed: 0,
  current: '',
  finished: false,
  failedItems: []
});

console.log('Cookie Importer background script loaded');