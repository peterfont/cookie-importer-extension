import { saveData, getData } from '../utils/storage-helper.js';
import { decryptData } from '../utils/crypto-helper.js';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  // DOM元素引用
  const cookieFileInput = document.getElementById('cookieFileInput');
  const cookieTextarea = document.getElementById('cookieTextarea');
  const encryptedTextarea = document.getElementById('encryptedTextarea');
  const importButton = document.getElementById('importButton');
  const clearButton = document.getElementById('clearButton');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const currentCookie = document.getElementById('currentCookie');
  const resultMessage = document.getElementById('resultMessage');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // 当前激活的标签
  let activeTab = 'normal-tab';
  
  // 定期检查导入进度
  let progressInterval = null;

  // 标签页切换
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // 更新按钮状态
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // 更新内容显示
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      
      // 记录当前标签
      activeTab = tabId;
    });
  });

  // 读取文件内容
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsText(file);
    });
  }

  // 更新导入进度UI
  function updateProgressUI(progress) {
    if (!progress) return;
    
    const percentage = progress.total > 0 
      ? Math.round((progress.imported + progress.failed) / progress.total * 100)
      : 0;
    
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `已导入: ${progress.imported} | 失败: ${progress.failed} | 总计: ${progress.total} (${percentage}%)`;
    
    if (progress.current) {
      currentCookie.textContent = `正在处理: ${progress.current}`;
    }
    
    // 如果完成了，显示结果消息
    if (progress.finished || (progress.total > 0 && (progress.imported + progress.failed) >= progress.total)) {
      const successRate = Math.round((progress.imported / progress.total) * 100);
      
      let resultHTML = `
        <div class="${successRate > 80 ? 'success' : 'error'}">
          导入完成!<br>
          成功: ${progress.imported} (${successRate}%)<br>
          失败: ${progress.failed} (${Math.round((progress.failed / progress.total) * 100)}%)
        </div>
      `;
      
      // 检查是否有特殊Cookie失败
      const specialCookieFails = progress.failedItems?.filter(item => item.isSpecialCookie) || [];
      
      if (specialCookieFails.length > 0) {
        resultHTML += `
          <div class="special-notice">
            <h4>安全Cookie导入提示</h4>
            <p>检测到 ${specialCookieFails.length} 个带有安全前缀(__Host-或__Secure-)的Cookie导入失败。</p>
            <p>这些Cookie有特殊安全要求：</p>
            <ul>
              <li><strong>__Host-</strong>: 必须使用HTTPS，不能有Domain属性，Path必须为"/"</li>
              <li><strong>__Secure-</strong>: 必须使用HTTPS</li>
            </ul>
            <p>这些限制是为了保护您的安全，浏览器强制实施。</p>
          </div>
        `;
      }
      
      // 添加失败项列表 (最多显示5个)
      if (progress.failedItems && progress.failedItems.length > 0) {
        resultHTML += '<div class="failed-items"><h4>部分失败项:</h4><ul>';
        const itemsToShow = progress.failedItems.slice(0, 5);
        
        itemsToShow.forEach(item => {
          resultHTML += `<li>${item.domain} - ${item.name}: ${item.error}</li>`;
        });
        
        if (progress.failedItems.length > 5) {
          resultHTML += `<li>... 以及其他 ${progress.failedItems.length - 5} 项</li>`;
        }
        
        resultHTML += '</ul></div>';
      }
      
      resultMessage.innerHTML = resultHTML;
      
      // 取消进度更新定时器
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  // 开始监控导入进度
  function startProgressMonitoring() {
    progressContainer.style.display = 'block';
    resultMessage.innerHTML = '';
    
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    progressInterval = setInterval(() => {
      chrome.runtime.sendMessage({ action: 'getImportProgress' }, (response) => {
        if (response && response.success) {
          updateProgressUI(response.progress);
        }
      });
    }, 500);
  }

  // 导入Cookie操作
  async function importCookies() {
    let cookieData = '';
    
    if (activeTab === 'normal-tab') {
      // 标准导入模式
      if (cookieFileInput.files.length > 0) {
        try {
          cookieData = await readFile(cookieFileInput.files[0]);
        } catch (error) {
          resultMessage.innerHTML = `<div class="error">读取文件失败: ${error.message}</div>`;
          return;
        }
      } else if (cookieTextarea.value.trim()) {
        cookieData = cookieTextarea.value.trim();
      } else {
        resultMessage.innerHTML = '<div class="error">请选择文件或输入Cookie数据</div>';
        return;
      }
    } else {
      // 加密导入模式
      const encryptedData = encryptedTextarea.value.trim();
      if (!encryptedData) {
        resultMessage.innerHTML = '<div class="error">请输入加密的Cookie数据</div>';
        return;
      }
      
      try {
        // 解密数据 (使用预设密码)
        cookieData = await decryptData(encryptedData, 'cookieImporterSecret');
      } catch (error) {
        resultMessage.innerHTML = `<div class="error">解密数据失败: ${error.message}</div>`;
        return;
      }
    }
    
    // 重置进度
    chrome.runtime.sendMessage({ action: 'resetImportProgress' }, () => {
      // 开始监控进度
      startProgressMonitoring();
      
      // 发送消息给背景脚本处理导入
      chrome.runtime.sendMessage(
        { action: 'parseAndImportCookies', data: cookieData }, 
        (response) => {
          if (response && !response.success) {
            resultMessage.innerHTML = '<div class="error">启动导入过程失败</div>';
            clearInterval(progressInterval);
            progressInterval = null;
          }
        }
      );
    });
  }

  // 清除输入
  function clearInputs() {
    cookieFileInput.value = '';
    cookieTextarea.value = '';
    encryptedTextarea.value = '';
    progressContainer.style.display = 'none';
    resultMessage.innerHTML = '';
    
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    // 重置进度
    chrome.runtime.sendMessage({ action: 'resetImportProgress' });
  }

  // 绑定事件处理器
  importButton.addEventListener('click', importCookies);
  clearButton.addEventListener('click', clearInputs);
  
  // 当选择文件时自动填充文本框
  cookieFileInput.addEventListener('change', async () => {
    if (cookieFileInput.files.length > 0) {
      try {
        cookieTextarea.value = await readFile(cookieFileInput.files[0]);
      } catch (error) {
        console.error('读取文件失败:', error);
        resultMessage.innerHTML = `<div class="error">读取文件失败: ${error.message}</div>`;
      }
    }
  });
});