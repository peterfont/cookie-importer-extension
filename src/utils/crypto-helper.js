/**
 * 解密数据
 * @param {string} encryptedBase64 - base64格式的加密数据
 * @param {string} password - 解密密码
 * @returns {Promise<string>} - 解密后的文本
 */
export async function decryptData(encryptedBase64, password = 'cookieImporterSecret') {
  // 解码base64
  const encryptedString = atob(encryptedBase64);
  const encryptedBytes = new Uint8Array(encryptedString.length);
  for (let i = 0; i < encryptedString.length; i++) {
    encryptedBytes[i] = encryptedString.charCodeAt(i);
  }
  
  // 分离出盐、iv和加密数据
  const salt = encryptedBytes.slice(0, 16);
  const iv = encryptedBytes.slice(16, 28);
  const data = encryptedBytes.slice(28);
  
  // 从密码生成密钥
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
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
    ['decrypt']
  );
  
  try {
    // 解密
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      data
    );
    
    // 转换为文本
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error('解密失败，请检查加密数据格式是否正确');
  }
}

/**
 * 加密数据
 * @param {string} text - 要加密的文本
 * @param {string} password - 加密密码
 * @returns {Promise<string>} - base64格式的加密数据
 */
export async function encryptData(text, password = 'cookieImporterSecret') {
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