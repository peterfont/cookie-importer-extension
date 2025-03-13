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

// 路径配置
const srcDir = path.resolve(__dirname, 'cookie-importer-extension-simple');
const distDir = path.resolve(__dirname, 'dist');
const zipPath = path.resolve(__dirname, 'cookie-importer-extension-simple.zip');

// 创建dist目录（如果不存在）
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 清理dist目录
console.log(chalk.blue('🧹 清理 dist 目录...'));
fs.rmdirSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

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
        { from: `${srcDir}/assets`, to: `${distDir}/assets` },
      ],
    }),
    // JavaScript代码混淆器
    new JavaScriptObfuscator({
      compact: true, // 压缩代码
      controlFlowFlattening: true, // 控制流平坦化
      controlFlowFlatteningThreshold: 0.7, // 控制流平坦化阈值
      deadCodeInjection: true, // 注入死代码
      deadCodeInjectionThreshold: 0.4, // 死代码注入阈值
      debugProtection: true, // 调试保护
      debugProtectionInterval: true, // 调试保护间隔
      disableConsoleOutput: true, // 禁用 console.* 输出
      identifierNamesGenerator: 'hexadecimal', // 标识符生成器
      log: false, // 日志
      renameGlobals: false, // 不重命名全局变量
      rotateStringArray: true, // 旋转字符串数组
      selfDefending: true, // 自我防御
      stringArray: true, // 字符串数组
      stringArrayEncoding: ['base64'], // 字符串数组编码
      stringArrayThreshold: 0.75, // 字符串数组阈值
      transformObjectKeys: true, // 转换对象键
      unicodeEscapeSequence: false // 不使用unicode转义
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
  if (err || stats.hasErrors()) {
    console.error(chalk.red('❌ 构建失败:'));
    if (err) {
      console.error(err.stack || err);
      if (err.details) {
        console.error(err.details);
      }
      return;
    }
    
    const info = stats.toJson();
    if (stats.hasErrors()) {
      console.error(chalk.red(info.errors));
    }
    if (stats.hasWarnings()) {
      console.warn(chalk.yellow(info.warnings));
    }
    return;
  }

  console.log(chalk.green('✅ 构建完成!'));
  
  // 创建压缩包
  createZipArchive();
});

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

// 自定义助手函数：额外处理HTML文件中的内联JS
function processHtmlFiles() {
  console.log(chalk.blue('🔍 处理HTML文件...'));
  
  // 处理 popup.html，找到内联脚本，提取出来，并加密，然后替换回去
  const popupHtmlPath = `${distDir}/src/popup/popup.html`;
  if (fs.existsSync(popupHtmlPath)) {
    let htmlContent = fs.readFileSync(popupHtmlPath, 'utf-8');
    
    // 使用正则表达式提取内联脚本
    const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
    htmlContent = htmlContent.replace(scriptRegex, (match, script) => {
      // 处理内联脚本 - 这里可以使用obfuscator直接处理
      const obfuscator = require('javascript-obfuscator');
      const obfuscatedScript = obfuscator.obfuscate(script, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.7,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: true,
        debugProtectionInterval: true,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        rotateStringArray: true,
        selfDefending: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: true
      }).getObfuscatedCode();
      
      return `<script>${obfuscatedScript}</script>`;
    });
    
    // 写回处理后的HTML文件
    fs.writeFileSync(popupHtmlPath, htmlContent);
    console.log(chalk.green('✅ HTML文件处理完成'));
  } else {
    console.warn(chalk.yellow('⚠️ 找不到popup.html文件'));
  }
}