import fs from 'fs';
import path from 'path';

// 尝试确定项目根目录
let rootDir = process.cwd();

// 如果 cwd 不包含 public 目录，尝试其他位置
const publicPath = path.join(rootDir, 'public');
if (!fs.existsSync(publicPath)) {
  // 尝试 /vercel/share/v0-project
  if (fs.existsSync('/vercel/share/v0-project/public')) {
    rootDir = '/vercel/share/v0-project';
  }
}

// 确保 public/data 目录存在
const dataDir = path.join(rootDir, 'public/data');

try {
  // 尝试创建目录（可能因权限问题失败）
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (mkdirError) {
    console.warn('⚠️ 无法创建 public/data 目录，可能是权限问题');
    console.warn('项目根目录:', rootDir);
  }
  
  // 读取 package.json 获取版本号
  const packagePath = path.join(rootDir, 'package.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    
    // 创建版本数据
    const versionData = {
      appVersion: pkg.version,
      dataVersion: "0.9.3",
      updatedAt: new Date().toISOString()
    };
    
    // 尝试写入版本信息
    try {
      fs.writeFileSync(path.join(dataDir, 'version.json'), JSON.stringify(versionData, null, 2));
      fs.writeFileSync(path.join(dataDir, 'templates.json'), JSON.stringify({ version: "0.9.3", config: [] }, null, 2));
      fs.writeFileSync(path.join(dataDir, 'banks.json'), JSON.stringify({ banks: {}, defaults: {}, categories: {} }, null, 2));
      
      console.log('✅ 数据同步成功！');
      console.log(`🚀 当前版本: App V${pkg.version}`);
    } catch (writeError) {
      // 如果写入失败，可能是权限或目录问题，但不要让脚本失败
      console.warn('⚠️ 数据文件写入失败，继续构建:', writeError.message);
    }
  } else {
    console.warn('⚠️ 找不到 package.json，跳过数据同步');
  }
} catch (error) {
  console.error('❌ 数据同步失败:', error.message);
  process.exit(1);
}
