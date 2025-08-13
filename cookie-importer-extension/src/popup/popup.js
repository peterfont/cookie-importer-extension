import { saveData, getData } from '../utils/storage-helper.js';
import { decryptData } from '../utils/crypto-helper.js';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  // DOM元素引用
  const cookieFileInput = document.getElementById('cookieFileInput');
  const cookieTextarea = document.getElementById('cookieTextarea');
  const encryptedTextarea = document.getElementById('encryptedTextarea');
  const encryptFileInput = document.getElementById('encryptFileInput');
  const encryptTextarea = document.getElementById('encryptTextarea');
  const encryptButton = document.getElementById('encryptButton');
  const clearEncryptButton = document.getElementById('clearEncryptButton');
  const encryptResultTextarea = document.getElementById('encryptResultTextarea');
  const copyEncryptButton = document.getElementById('copyEncryptButton');
  
  // 批量加密元素
  const batchFileInput = document.getElementById('batchFileInput');
  const batchDropArea = document.getElementById('batchDropArea');
  const selectedFilesContainer = document.getElementById('selectedFilesContainer');
  const selectedFilesList = document.getElementById('selectedFilesList');
  const batchEncryptButton = document.getElementById('batchEncryptButton');
  const clearBatchButton = document.getElementById('clearBatchButton');
  const batchProgressContainer = document.getElementById('batchProgressContainer');
  const batchProgressBar = document.getElementById('batchProgressBar');
  const batchProgressText = document.getElementById('batchProgressText');
  const batchResultsContainer = document.getElementById('batchResultsContainer');
  const batchResultsTable = document.getElementById('batchResultsTable');
  const exportAllButton = document.getElementById('exportAllButton');
  const downloadLinkContainer = document.getElementById('downloadLinkContainer');
  
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
  
  // 批量加密状态变量
  let selectedFiles = [];
  let encryptionResults = [];
  let selectedFormat = 'json';
  
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
      
      // 根据标签页显示/隐藏主操作按钮
      const mainActions = document.getElementById('mainActions');
      if (tabId === 'encrypt-tab' || tabId === 'batch-encrypt-tab') {
        mainActions.style.display = 'none';
      } else {
        mainActions.style.display = 'flex';
      }
    });
  });

  // 初始化批量加密拖放功能
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    batchDropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    batchDropArea.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    batchDropArea.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    batchDropArea.classList.add('dragover');
  }

  function unhighlight() {
    batchDropArea.classList.remove('dragover');
  }

  batchDropArea.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }

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

  // 加密函数
  async function encryptData(text, password = 'cookieImporterSecret') {
    // 使用 Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // 从密码生成密钥
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // 生成随机盐
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    // 派生AES密钥
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // 初始化向量
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // 加密
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      data
    );
    
    // 将盐、iv和加密数据合并
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // 转换为base64
    return btoa(String.fromCharCode(...result));
  }

  // 批量加密功能函数
  
  // 处理选择的文件
  function handleFiles(files) {
    if (files.length === 0) return;

    for (const file of files) {
      if (file.name.endsWith('.txt')) {
        // 检查文件是否已经添加
        if (!selectedFiles.some(existingFile => existingFile.name === file.name)) {
          selectedFiles.push(file);
        }
      }
    }

    updateFilesList();
    updateButtonStates();
  }

  // 更新文件列表UI
  function updateFilesList() {
    selectedFilesList.innerHTML = '';

    if (selectedFiles.length === 0) {
      selectedFilesContainer.classList.add('empty');
      return;
    }

    selectedFilesContainer.classList.remove('empty');

    selectedFiles.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';

      const fileName = document.createElement('div');
      fileName.className = 'file-name';
      fileName.textContent = file.name;

      const removeBtn = document.createElement('div');
      removeBtn.className = 'file-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        updateFilesList();
        updateButtonStates();
      });

      fileItem.appendChild(fileName);
      fileItem.appendChild(removeBtn);
      selectedFilesList.appendChild(fileItem);
    });
  }

  // 更新按钮状态
  function updateButtonStates() {
    batchEncryptButton.disabled = selectedFiles.length === 0;
    clearBatchButton.disabled = selectedFiles.length === 0;
  }

  // 顺序处理所有文件
  async function processFilesSequentially() {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileContent = await readFile(file);

      try {
        const encryptedData = await encryptData(fileContent);
        encryptionResults.push({
          fileName: file.name,
          originalData: fileContent,
          encryptedData: encryptedData
        });
      } catch (error) {
        console.error(`加密文件 ${file.name} 失败:`, error);
        encryptionResults.push({
          fileName: file.name,
          error: error.message
        });
      }

      // 更新进度
      const progress = ((i + 1) / selectedFiles.length) * 100;
      batchProgressBar.style.width = `${progress}%`;
      batchProgressText.textContent = `处理中: ${i + 1}/${selectedFiles.length}`;
    }
  }

  // 显示批量加密结果
  function displayBatchResults() {
    batchResultsContainer.style.display = 'block';
    batchResultsTable.innerHTML = '';

    encryptionResults.forEach((result, index) => {
      const resultRow = document.createElement('div');
      resultRow.className = 'result-row';

      const fileNameDiv = document.createElement('div');
      fileNameDiv.className = 'result-file-name';
      fileNameDiv.textContent = result.fileName;

      const dataDiv = document.createElement('div');
      dataDiv.className = 'result-encrypted-data';
      if (result.error) {
        dataDiv.textContent = `错误: ${result.error}`;
        dataDiv.style.color = '#cf1322';
      } else {
        dataDiv.title = result.encryptedData;
        dataDiv.textContent = result.encryptedData;
      }

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'result-actions';
      if (!result.error) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = '复制';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(result.encryptedData)
            .then(() => {
              copyBtn.textContent = '已复制';
              setTimeout(() => {
                copyBtn.textContent = '复制';
              }, 2000);
            })
            .catch(err => {
              console.error('复制失败:', err);
            });
        });
        actionsDiv.appendChild(copyBtn);
      }

      resultRow.appendChild(fileNameDiv);
      resultRow.appendChild(dataDiv);
      resultRow.appendChild(actionsDiv);

      batchResultsTable.appendChild(resultRow);
    });
  }

  // 导出所有结果
  function exportAllResults() {
    if (encryptionResults.length === 0) {
      showNotification('没有可导出的结果', 'error');
      return;
    }

    let fileContent;
    let mimeType;
    let fileName;

    if (selectedFormat === 'json') {
      // 准备JSON格式数据
      const exportData = encryptionResults.map(result => ({
        fileName: result.fileName,
        encryptedData: result.encryptedData || null,
        error: result.error || null
      }));

      fileContent = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      fileName = 'cookie-encryption-results.json';
    } else { // CSV
      // 准备CSV格式数据
      const header = 'File Name,Encrypted Data,Error\n';
      const rows = encryptionResults.map(result =>
        `"${result.fileName}","${result.encryptedData || ''}","${result.error || ''}"`
      ).join('\n');

      fileContent = header + rows;
      mimeType = 'text/csv';
      fileName = 'cookie-encryption-results.csv';
    }

    // 创建下载链接
    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);

    downloadLinkContainer.innerHTML = '';
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    downloadLink.className = 'download-link';
    downloadLink.textContent = `下载 ${fileName}`;

    downloadLinkContainer.appendChild(downloadLink);

    // 自动点击下载
    downloadLink.click();
  }

  // 显示通知
  function showNotification(message, type) {
    resultMessage.innerHTML = `<div class="${type}">${message}</div>`;
    
    // 3秒后自动清除
    setTimeout(() => {
      if (resultMessage.innerHTML.includes(message)) {
        resultMessage.innerHTML = '';
      }
    }, 3000);
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

  // 加密功能事件处理器
  
  // 当选择加密文件时自动填充文本框
  encryptFileInput.addEventListener('change', async () => {
    if (encryptFileInput.files.length > 0) {
      try {
        encryptTextarea.value = await readFile(encryptFileInput.files[0]);
      } catch (error) {
        showNotification(`读取文件失败: ${error.message}`, 'error');
      }
    }
  });

  // 加密按钮点击事件
  encryptButton.addEventListener('click', async () => {
    const cookieData = encryptTextarea.value.trim();
    
    if (!cookieData) {
      showNotification('请先选择文件或输入Cookie数据', 'error');
      return;
    }
    
    try {
      const encryptedData = await encryptData(cookieData);
      encryptResultTextarea.value = encryptedData;
      showNotification('数据加密成功！', 'success');
    } catch (error) {
      showNotification(`加密失败: ${error.message}`, 'error');
    }
  });

  // 清除加密数据按钮
  clearEncryptButton.addEventListener('click', () => {
    encryptFileInput.value = '';
    encryptTextarea.value = '';
    encryptResultTextarea.value = '';
    resultMessage.innerHTML = '';
  });

  // 复制加密数据按钮
  copyEncryptButton.addEventListener('click', () => {
    if (!encryptResultTextarea.value) {
      showNotification('没有可复制的数据', 'error');
      return;
    }
    
    encryptResultTextarea.select();
    document.execCommand('copy');
    
    showNotification('已复制到剪贴板!', 'success');
  });

  // 批量加密功能事件处理器
  
  // 监听批量文件选择事件
  batchFileInput.addEventListener('change', function () {
    handleFiles(this.files);
  });

  // 批量加密按钮
  batchEncryptButton.addEventListener('click', async function () {
    if (selectedFiles.length === 0) {
      showNotification('请先选择文件', 'error');
      return;
    }

    // 重置结果
    encryptionResults = [];
    batchResultsTable.innerHTML = '';
    batchResultsContainer.style.display = 'none';

    // 显示进度条
    batchProgressContainer.style.display = 'block';
    batchProgressBar.style.width = '0%';
    batchProgressText.textContent = `处理中: 0/${selectedFiles.length}`;

    try {
      await processFilesSequentially();

      // 完成后
      showNotification(`成功加密 ${encryptionResults.length} 个文件`, 'success');
      batchProgressContainer.style.display = 'none';
      displayBatchResults();
    } catch (error) {
      showNotification(`加密过程中发生错误: ${error.message}`, 'error');
      batchProgressContainer.style.display = 'none';
    }
  });

  // 清除批量文件按钮
  clearBatchButton.addEventListener('click', function () {
    selectedFiles = [];
    updateFilesList();
    updateButtonStates();
    showNotification('已清除所有文件', 'success');
  });

  // 导出所有结果按钮
  exportAllButton.addEventListener('click', exportAllResults);

  // 格式选择器事件
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('format-option')) {
      document.querySelectorAll('.format-option').forEach(opt => opt.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedFormat = e.target.getAttribute('data-format');
    }
  });
});