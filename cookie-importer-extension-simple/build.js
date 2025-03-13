// build.js - 构建脚本
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const JavaScriptObfuscator = require('webpack-obfuscator');
const archiver = require('archiver');
const chalk = require('chalk');

// 路径配置 - 修正为当前目录下的dist
const srcDir = path.resolve(__dirname); // 当前目录作为源目录
const distDir = path.resolve(__dirname, './dist'); // 当前目录下的dist文件夹
const zipPath = path.resolve(__dirname, './cookie-importer-extension-simple.zip'); // 当前目录下的zip文件

// 显示路径信息以便调试
console.log(chalk.blue('📂 源代码目录:'), srcDir);
console.log(chalk.blue('📂 输出目录:'), distDir);
console.log(chalk.blue('📂 压缩包路径:'), zipPath);

// 创建dist目录（如果不存在）
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 清理dist目录
console.log(chalk.blue('🧹 清理 dist 目录...'));
try {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
} catch (error) {
  console.error(chalk.red('❌ 清理目录失败:'), error.message);
}

// Webpack配置
const webpackConfig = {
  mode: 'production',
  entry: {
    // 设置入口文件
    'background/background': `${srcDir}/src/background/background.js`,
    'popup/popup': `${srcDir}/src/popup/popup.js`,
    'utils/crypto-helper': `${srcDir}/src/utils/crypto-helper.js`,
    'utils/cookie-parser': `${srcDir}/src/utils/cookie-parser.js`,
    'utils/storage-helper': `${srcDir}/src/utils/storage-helper.js`,
  },
  output: {
    path: `${distDir}/src`,
    filename: '[name].js',
    clean: false // 不清理输出文件夹，我们已经手动清理了
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false, // 不提取注释
        terserOptions: {
          format: {
            comments: false, // 删除所有注释
          },
          compress: {
            drop_console: true, // 删除console语句
            drop_debugger: true, // 删除debugger语句
            pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
          },
          mangle: {
            reserved: ['chrome'], // 保留chrome API名称
            properties: {
              regex: /^_/ // 只混淆以 _ 开头的属性名
            }
          }
        },
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-class-properties']
          }
        }
      }
    ]
  },
  plugins: [
    // 清理输出目录
    new CleanWebpackPlugin({
      dry: false, // 非测试模式
      verbose: true, // 输出日志
      cleanOnceBeforeBuildPatterns: ['**/*'] // 删除所有文件
    }),
    // 复制静态资源
    new CopyPlugin({
      patterns: [
        { from: `${srcDir}/manifest.json`, to: `${distDir}/manifest.json` },
        { from: `${srcDir}/src/popup/popup.html`, to: `${distDir}/src/popup/popup.html` },
        { from: `${srcDir}/src/popup/popup.css`, to: `${distDir}/src/popup/popup.css` },
        { from: `${srcDir}/assets`, to: `${distDir}/assets`, noErrorOnMissing: true },
      ],
    }),
    // 为了解决导入问题，降低混淆强度
    new JavaScriptObfuscator({
      compact: true,
      // 显著降低混淆强度，以确保功能正常工作
      controlFlowFlattening: false, // 禁用控制流平坦化
      deadCodeInjection: false,     // 禁用死代码注入
      // 保留所有关键功能名称
      reservedNames: [
        'decryptData', 'parseCookies', 'importCookies', 'encryptData',
        'saveData', 'getData', 'chrome', 'TextEncoder', 'TextDecoder',
        'Uint8Array', 'atob', 'btoa'
      ],
      // 其它配置保持相对简单
      debugProtection: false,
      debugProtectionInterval: 0,
      disableConsoleOutput: false, // 允许控制台输出以便调试
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      renameGlobals: false,
      rotateStringArray: false,
      selfDefending: false,
      stringArray: true,
      stringArrayEncoding: ['none'], // 不进行额外编码
      stringArrayThreshold: 0.5,
      transformObjectKeys: false,
      unicodeEscapeSequence: false
    }),
    // 显示构建进度
    new webpack.ProgressPlugin({
      activeModules: false,
      entries: true,
      handler(percentage, message, ...args) {
        process.stdout.write(chalk.green(`${Math.round(percentage * 100)}% `) + chalk.yellow(`${message} `) + args.join(' ') + '\n');
      }
    })
  ],
  performance: {
    hints: false, // 禁用性能提示
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};

// 运行Webpack构建
console.log(chalk.blue('🔨 开始构建...'));
webpack(webpackConfig, (err, stats) => {
  if (err) {
    console.error(chalk.red('❌ 构建时发生错误:'));
    console.error(err.stack || err);
    if (err.details) {
      console.error(chalk.red('错误详情:'));
      console.error(err.details);
    }
    return;
  }

  const info = stats.toJson();
  
  // 处理错误
  if (stats.hasErrors()) {
    console.error(chalk.red('❌ 构建过程中出现错误:'));
    info.errors.forEach((error, index) => {
      console.error(chalk.red(`错误 ${index + 1}:`));
      console.error(typeof error === 'object' ? error.message || JSON.stringify(error) : error);
    });
    return;
  }
  
  // 处理警告
  if (stats.hasWarnings()) {
    console.warn(chalk.yellow('⚠️ 构建过程中出现警告:'));
    info.warnings.forEach((warning, index) => {
      console.warn(chalk.yellow(`警告 ${index + 1}:`));
      console.warn(typeof warning === 'object' ? warning.message || JSON.stringify(warning) : warning);
    });
  }

  console.log(chalk.green('✅ 构建完成!'));
  
  // 添加简单调试脚本以帮助诊断问题
  addDebugSupport();
  
  // 创建压缩包
  createZipArchive();
});

// 添加调试支持
function addDebugSupport() {
  console.log(chalk.blue('🔍 添加调试支持...'));
  
  // 添加调试助手到popup.js
  const popupJsPath = `${distDir}/src/popup/popup.js`;
  
  try {
    if (fs.existsSync(popupJsPath)) {
      let jsContent = fs.readFileSync(popupJsPath, 'utf-8');
      
      // 添加调试包装器
      const debugWrapper = `
// 调试支持 - 开始
window.addEventListener('error', function(event) {
  const errorDiv = document.createElement('div');
  errorDiv.style.color = 'red';
  errorDiv.style.border = '1px solid red';
  errorDiv.style.padding = '10px';
  errorDiv.style.margin = '10px';
  errorDiv.style.backgroundColor = '#ffebee';
  errorDiv.textContent = '错误: ' + event.message + ' at ' + event.filename + ':' + event.lineno;
  document.body.appendChild(errorDiv);
});

try {
${jsContent}
} catch (globalError) {
  console.error('全局错误:', globalError);
  // 创建错误显示
  setTimeout(function() {
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.border = '1px solid red';
    errorDiv.style.padding = '10px';
    errorDiv.style.margin = '10px';
    errorDiv.style.backgroundColor = '#ffebee';
    errorDiv.textContent = '全局错误: ' + globalError.message;
    document.body.appendChild(errorDiv);
  }, 500);
}
// 调试支持 - 结束
      `;
      
      fs.writeFileSync(popupJsPath, debugWrapper);
      console.log(chalk.green('✅ 调试支持已添加到 popup.js'));
    }
  } catch (error) {
    console.error(chalk.red('❌ 添加调试支持失败:'), error.message);
  }
}

// 自定义助手函数：额外处理HTML文件中的内联JS
function processHtmlFiles() {
  console.log(chalk.blue('🔍 处理HTML文件...'));
  
  // 处理 popup.html，找到内联脚本，提取出来，并加密，然后替换回去
  const popupHtmlPath = `${distDir}/src/popup/popup.html`;
  
  try {
    if (fs.existsSync(popupHtmlPath)) {
      let htmlContent = fs.readFileSync(popupHtmlPath, 'utf-8');
      
      // 使用正则表达式提取内联脚本
      const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
      let hasScripts = false;
      
      htmlContent = htmlContent.replace(scriptRegex, (match, script) => {
        hasScripts = true;
        // 最小化内联JS的混淆，确保功能正常
        const obfuscator = require('javascript-obfuscator');
        const obfuscatedScript = obfuscator.obfuscate(script, {
          compact: true,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          debugProtection: false,
          debugProtectionInterval: 0,
          disableConsoleOutput: false,
          identifierNamesGenerator: 'hexadecimal',
          rotateStringArray: false,
          selfDefending: false,
          stringArray: true,
          stringArrayEncoding: ['none'],
          stringArrayThreshold: 0.5,
          transformObjectKeys: false
        }).getObfuscatedCode();
        
        return `<script>${obfuscatedScript}</script>`;
      });
      
      // 如果有脚本被处理
      if (hasScripts) {
        // 写回处理后的HTML文件
        fs.writeFileSync(popupHtmlPath, htmlContent);
        console.log(chalk.green('✅ HTML文件中的JS代码已处理'));
      } else {
        console.log(chalk.yellow('⚠️ HTML文件中未发现内联脚本'));
      }
    } else {
      console.warn(chalk.yellow('⚠️ 找不到popup.html文件'));
    }
  } catch (error) {
    console.error(chalk.red('❌ 处理HTML文件失败:'), error.message);
  }
}

// 创建ZIP压缩包
function createZipArchive() {
  console.log(chalk.blue('📦 创建扩展压缩包...'));
  
  // 创建一个文件写入流
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // 最高压缩级别
  });

  // 监听所有归档数据都写完
  output.on('close', function() {
    const fileSize = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(chalk.green(`✅ 压缩完成! 文件大小: ${fileSize} MB`));
    console.log(chalk.green(`📂 压缩包路径: ${zipPath}`));
  });

  // 监听警告
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn(chalk.yellow('⚠️ 警告:'), err);
    } else {
      console.error(chalk.red('❌ 错误:'), err);
    }
  });

  // 监听错误
  archive.on('error', function(err) {
    console.error(chalk.red('❌ 压缩失败:'), err);
  });

  // 管道连接输出流
  archive.pipe(output);

  // 将dist目录的内容添加到压缩包
  archive.directory(distDir, false);

  // 完成归档
  archive.finalize();
}