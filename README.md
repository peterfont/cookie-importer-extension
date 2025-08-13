# Cookie 导入工具

一个功能完整的Chrome扩展，用于从Netscape格式文件或加密数据导入Cookie到浏览器。该扩展提供密码生成、密码自动填充、云端同步等功能，保障用户网络账号安全。

## 功能特性

### 🔐 标准导入
- 支持上传Netscape格式的Cookie文件(.txt)
- 支持直接粘贴Cookie文本数据
- 实时显示导入进度
- 详细的成功/失败统计

### 🔒 加密导入
- 支持导入通过加密工具生成的加密Cookie数据
- 使用AES-GCM加密算法保护数据安全
- 自动解密并导入Cookie

### 🛠️ 加密工具
- **文件上传加密**: 上传Cookie文件进行加密
- **文本加密**: 直接粘贴Cookie文本进行加密
- **安全算法**: 使用PBKDF2 + AES-GCM加密算法
- **一键复制**: 加密后数据可一键复制到剪贴板
- **本地处理**: 所有加密操作在本地完成，数据不会上传

### 📦 批量加密
- **多文件选择**: 支持同时选择多个Cookie文件
- **拖放支持**: 支持拖放文件到指定区域
- **批量处理**: 一次性加密多个文件，显示处理进度
- **结果管理**: 清晰显示每个文件的加密结果
- **导出功能**: 支持JSON和CSV格式导出所有结果
- **错误处理**: 显示加密失败的文件和错误信息

## 使用方法

### 1. 标准导入
1. 点击"标准导入"标签页
2. 选择Cookie文件或粘贴Cookie文本
3. 点击"导入Cookie"按钮
4. 查看导入进度和结果

### 2. 加密导入
1. 点击"加密导入"标签页
2. 粘贴从加密工具获取的加密数据
3. 点击"导入Cookie"按钮
4. 系统自动解密并导入

### 3. 加密工具
1. 点击"加密工具"标签页
2. 上传Cookie文件或粘贴Cookie文本
3. 点击"加密数据"按钮
4. 复制生成的加密文本
5. 在"加密导入"标签页中使用

### 4. 批量加密
1. 点击"批量加密"标签页
2. 拖放多个Cookie文件或点击选择多个文件
3. 点击"批量加密"按钮
4. 查看加密进度和结果
5. 复制单个结果或导出所有结果

## 安全特性

- **本地加密**: 所有加密操作在浏览器本地完成
- **强加密算法**: 使用PBKDF2密钥派生和AES-GCM加密
- **随机盐值**: 每次加密都使用随机盐值
- **安全传输**: 加密后的数据可以安全分享
- **批量安全**: 批量加密同样使用相同的安全标准

## 安装说明

1. 下载扩展文件
2. 在Chrome中打开 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择扩展目录

## 技术架构

- **前端**: HTML5 + CSS3 + JavaScript ES6+
- **加密**: Web Crypto API (PBKDF2 + AES-GCM)
- **存储**: Chrome Extension Storage API
- **权限**: cookies, storage, activeTab
- **拖放**: HTML5 Drag and Drop API
- **文件处理**: File API + FileReader API

## 项目结构

```
cookie-importer-extension/
├── README.md                    # 项目说明文档
├── manifest.json               # Chrome扩展清单文件
├── assets/                     # 图标资源目录
│   └── icons/
│       ├── icon16.png         # 16x16 图标
│       ├── icon48.png         # 48x48 图标
│       └── icon128.png        # 128x128 图标
├── src/                        # 源代码目录
│   ├── background/            # 后台脚本
│   │   └── background.js
│   ├── content-scripts/       # 内容脚本
│   │   └── content.js
│   ├── popup/                 # 弹窗界面
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── utils/                 # 工具函数
│       ├── cookie-parser.js   # Cookie解析工具
│       ├── crypto-helper.js   # 加密工具
│       └── storage-helper.js  # 存储工具
├── batch-encrypt-page.html    # 批量加密页面
└── encrypt-page.html          # 加密页面
```

## 注意事项

- 加密工具使用固定密码 `cookieImporterSecret`
- 加密后的数据包含盐值和初始化向量，每次加密结果都不同
- 建议在安全环境下使用加密功能
- 支持所有现代浏览器的Web Crypto API
- 批量加密支持最多100个文件同时处理
- 导出功能支持JSON和CSV两种格式

## 更新日志

### v1.0
- 基础Cookie导入功能
- 加密导入支持
- 实时进度显示
- 错误处理和统计

### v1.1
- 新增集成加密工具
- 支持文件上传加密
- 改进的用户界面
- 增强的安全特性

### v1.2
- 新增批量加密功能
- 支持拖放文件操作
- 多文件同时处理
- 结果导出功能
- 优化的用户界面

### v1.3 (最新)
- 重构项目结构
- 优化文件组织
- 清理冗余文件
- 改进文档说明

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目！

### 开发环境设置
1. 克隆仓库
2. 安装依赖
3. 运行开发服务器
4. 在Chrome中加载扩展

### 代码规范
- 使用ES6+语法
- 遵循Chrome扩展开发最佳实践
- 保持代码简洁和可读性

## 许可证

MIT License

## 联系方式

- 项目地址: [https://github.com/peterfont/cookie-importer-extension](https://github.com/peterfont/cookie-importer-extension)
- 问题反馈: 请在GitHub Issues中提交

---

**注意**: 此扩展仅用于合法的Cookie管理目的，请遵守相关法律法规和网站使用条款。
