# 详细安装指南

本文档提供详细的安装和配置步骤，特别是针对 SQLite 原生模块的编译配置。

## 📋 系统要求

- Node.js 16.x 或更高版本
- npm 或 yarn 包管理器
- 足够的编译工具（根据操作系统）

## 🔧 预安装准备

### Windows 系统

#### 方法一：安装 Windows Build Tools（推荐）
```bash
# 以管理员身份运行 PowerShell 或 CMD
npm install --global windows-build-tools
```

这将自动安装：
- Python 2.7
- Visual C++ Build Tools

#### 方法二：手动安装 Visual Studio
1. 下载并安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
2. 在安装时选择 "使用 C++ 的桌面开发" 工作负载
3. 确保勾选：
   - MSVC v142 或更高版本
   - Windows 10/11 SDK

### macOS 系统

安装 Xcode Command Line Tools：
```bash
xcode-select --install
```

如果已经安装，可以验证：
```bash
xcode-select -p
# 应该输出: /Library/Developer/CommandLineTools
```

### Linux 系统

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

#### CentOS/RHEL/Fedora
```bash
sudo yum groupinstall "Development Tools"
sudo yum install python3
```

#### Arch Linux
```bash
sudo pacman -S base-devel python
```

## 📦 安装步骤

### 1. 创建项目目录
```bash
mkdir expense-tracker
cd expense-tracker
```

### 2. 复制所有项目文件

确保包含以下文件：
```
expense-tracker/
├── .vscode/
│   └── settings.json
├── .editorconfig
├── package.json
├── main.js
├── preload.js
├── index.html
├── styles.css
└── renderer.js
```

### 3. 安装依赖
```bash
npm install
```

**可能遇到的问题**：

#### 问题 1: better-sqlite3 编译失败
```bash
# Windows
npm install --global windows-build-tools

# macOS
xcode-select --install

# Linux
sudo apt-get install build-essential
```

然后重新安装：
```bash
npm install
```

#### 问题 2: 权限错误（Linux/macOS）
```bash
# 不要使用 sudo npm install
# 而是修复 npm 权限
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### 问题 3: Node 版本不匹配
```bash
# 检查 Node 版本
node --version

# 如果版本低于 16.x，请升级
# 推荐使用 nvm 管理 Node 版本
```

### 4. 重建原生模块
```bash
npm run rebuild
```

这一步会重新编译 better-sqlite3 以匹配 Electron 版本。

**可能遇到的错误**：

#### 错误: MSBuild 未找到（Windows）
解决方案：
1. 安装 Visual Studio Build Tools
2. 重启电脑
3. 重新运行 `npm run rebuild`

#### 错误: gyp ERR! stack Error: not found: python
解决方案：
```bash
# Windows（以管理员运行）
npm install --global --production windows-build-tools

# macOS/Linux
# 确保安装了 Python 2.7 或 3.x
python --version
```

### 5. 验证安装
```bash
# 运行应用
npm start
```

如果应用正常启动并显示界面，说明安装成功！

## 🔍 故障排查

### 问题：应用启动时报错 "Cannot find module 'better-sqlite3'"
**解决方案**：
```bash
# 删除 node_modules
rm -rf node_modules

# 清除 npm 缓存
npm cache clean --force

# 重新安装
npm install
npm run rebuild
```

### 问题：菜单显示乱码
**解决方案**：
1. 确保所有 .js 文件保存为 UTF-8 编码
2. 使用 VS Code 或 Sublime Text 编辑器
3. 检查右下角编码显示为 "UTF-8"

### 问题：数据库文件无法创建
**解决方案**：
```bash
# 检查应用数据目录权限
# Windows: C:\Users\<用户名>\AppData\Roaming\expense-tracker
# macOS: ~/Library/Application Support/expense-tracker
# Linux: ~/.config/expense-tracker

# 确保该目录可写
```

### 问题：打包后的应用无法运行
**解决方案**：
```bash
# 确保在打包前重建了原生模块
npm run rebuild

# 然后再打包
npm run build
```

## 📱 不同平台的特殊说明

### Windows 平台
- 首次安装可能需要 10-20 分钟（安装编译工具）
- 需要管理员权限安装编译工具
- 防火墙可能会拦截，请允许访问

### macOS 平台
- 需要 macOS 10.13 或更高版本
- 首次运行可能需要在"系统偏好设置 → 安全性与隐私"中允许
- 如果提示"已损坏"，运行：
  ```bash
  sudo xattr -rd com.apple.quarantine /Applications/费用统计器.app
  ```

### Linux 平台
- 推荐使用 Ubuntu 18.04 或更高版本
- 某些发行版可能需要额外的依赖：
  ```bash
  sudo apt-get install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libappindicator3-1 libsecret-1-0
  ```

## ✅ 安装验证清单

安装完成后，请检查：

- [ ] 应用可以正常启动
- [ ] 菜单显示正常（中文无乱码）
- [ ] 可以添加记录
- [ ] 记录保存后关闭应用，重新打开后记录仍然存在
- [ ] 可以设置汇率
- [ ] 统计功能正常
- [ ] 可以删除记录
- [ ] 可以导出数据

如果所有项目都正常，恭喜你安装成功！

## 🆘 获取帮助

如果遇到无法解决的问题：

1. 查看控制台错误信息
2. 检查 npm 版本：`npm --version`（推荐 8.x 或更高）
3. 检查 Node 版本：`node --version`（推荐 16.x 或更高）
4. 查看日志文件（在应用数据目录）
5. 提供完整的错误信息以便诊断

## 📚 相关资源

- [Electron 官方文档](https://www.electronjs.org/docs)
- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3)
- [Node.js 官网](https://nodejs.org/)
- [npm 故障排查](https://docs.npmjs.com/troubleshooting)
