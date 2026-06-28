const ci = require('miniprogram-ci');
const path = require('path');

const APPID = 'wx504c106474975d60';
const PROJECT_PATH = path.resolve(__dirname);
const PRIVATE_KEY_PATH = path.join(__dirname, '..', 'secrets', 'wechat-miniapp-private.key');

(async () => {
  try {
    const project = new ci.Project({
      appid: APPID,
      type: 'miniProgram',
      projectPath: PROJECT_PATH,
      privateKeyPath: PRIVATE_KEY_PATH,
      ignores: ['node_modules/**/*'],
    });

    const args = process.argv.slice(2);
    const command = args[0] || 'upload';
    const version = args[1] || '1.0.0';
    const desc = args[2] || '走失人员管理系统更新';

    if (command === 'upload') {
      console.log('📤 开始上传小程序代码...');
      console.log(`   版本: ${version}`);
      console.log(`   描述: ${desc}`);
      
      const uploadResult = await ci.upload({
        project,
        version,
        desc,
        setting: {
          es6: true,
          es7: true,
          minify: true,
          autoPrefixWXSS: true,
        },
      });
      
      console.log('✅ 上传成功！');
      console.log('   请到微信小程序后台 https://mp.weixin.qq.com 设置为体验版或提交审核');
      if (uploadResult.subPackageInfo) {
        console.log('   分包信息:', JSON.stringify(uploadResult.subPackageInfo));
      }
    } else if (command === 'preview') {
      console.log('🔍 生成预览码...');
      
      const previewResult = await ci.preview({
        project,
        desc: '预览版本',
        setting: {
          es6: true,
          es7: true,
          minify: true,
        },
        qrcodeFormat: 'image',
        qrcodeOutputDest: path.resolve(__dirname, 'preview-qrcode.png'),
      });
      
      console.log('✅ 预览码已保存到: preview-qrcode.png');
      console.log('   请用微信扫描该二维码体验');
    } else {
      console.log('用法: node upload.js [upload|preview] [version] [desc]');
      console.log('  upload   - 上传代码到微信后台');
      console.log('  preview  - 生成预览二维码');
    }
  } catch (err) {
    console.error('❌ 操作失败:', err.message);
    if (err.message.includes('private key')) {
      console.error('   请检查密钥文件路径是否正确:', PRIVATE_KEY_PATH);
    }
    if (err.message.includes('ip')) {
      console.error('   请在小程序后台「开发设置 → IP白名单」中添加当前IP');
    }
    process.exit(1);
  }
})();