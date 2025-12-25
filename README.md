# Electron 费用统计管理系统 (双币种 + SQLite 持久化版)

一个基于 Electron 开发的桌面应用程序，支持 USDT 和泰铢双币种记录和统计，数据持久化存储到本地 SQLite 数据库。

## 📚 文档导航

- **[README.md](README.md)** - 项目概述和快速开始（本文档）
- **[INSTALL.md](INSTALL.md)** - 详细安装指南（推荐阅读）
- **[DATABASE.md](DATABASE.md)** - 数据库结构和维护说明

## 📋 功能特性

### 核心功能
- ✅ **SQLite 数据持久化** - 所有数据自动保存到本地数据库
- ✅ 汇率设置和管理 (1 USDT = X THB)
- ✅ 双币种输入（USDT 或泰铢，自动换算另一种）
- ✅ 录入费用信息（日期、姓名、金额、位置）
- ✅ 按日期统计总金额（USDT + THB）
- ✅ 按位置统计小计金额（USDT + THB）
- ✅ 按日期+位置组合统计（USDT + THB）
- ✅ 记录管理（查看、删除）
- ✅ **数据导出功能** - 导出为 JSON 格式
- ✅ **数据库信息查看** - 查看记录数和数据库大小
- ✅ 数据实时刷新

### 数据持久化特性
- 💾 **自动保存**: 每次添加记录自动写入数据库
- 🔒 **安全存储**: 数据存储在用户数据目录
- 📊 **完整记录**: 保存所有字段包括汇率历史
- 🚀 **快速查询**: SQLite 高性能数据库引擎
- 📁 **数据库位置**: 
  - Windows: `C:\Users\<用户名>\AppData\Roaming\expense-tracker\expenses.db`
  - macOS: `~/Library/Application Support/expense-tracker/expenses.db`
  - Linux: `~/.config/expense-tracker/expenses.db`

### 货币转换逻辑
- **USDT 输入**: 泰铢 = USDT × 汇率
- **泰铢输入**: USDT = 泰铢 ÷ 汇率
- **实时转换**: 输入时显示换算结果
- **统一汇率**: 所有统计使用相同汇率

## 🚀 快速开始

### 环境要求
- Node.js 16.x 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

#### 1. 创建项目目录
```bash
mkdir expense-tracker
cd expense-tracker
```

#### 2. 创建所有必需文件

将以下文件保存到项目目录：

**文件结构：**
```
expense-tracker/
├── .vscode/
│   └── settings.json    # VS Code 编码设置
├── .editorconfig        # 编辑器配置（确保UTF-8编码）
├── package.json          # 项目配置文件
├── main.js              # 主进程（后端逻辑）
├── preload.js           # 预加载脚本（安全桥接）
├── index.html           # 主界面（HTML结构）
├── styles.css           # 样式文件（界面美化）
└── renderer.js          # 渲染进程（前端逻辑）
```

**重要：确保文件编码为 UTF-8**
- 所有 `.js`、`.html`、`.css` 文件必须保存为 UTF-8 编码
- 已提供 `.vscode/settings.json` 和 `.editorconfig` 配置文件
- 使用 VS Code、Sublime Text 或其他现代编辑器时，这些配置会自动生效

#### 3. 安装依赖
```bash
npm install
```

这将自动安装：
- electron（Electron 框架）
- better-sqlite3（SQLite 数据库）
- electron-builder（打包工具）
- electron-rebuild（原生模块重建工具）

#### 4. 重建原生模块（重要！）
```bash
npm run rebuild
```

这一步很重要，用于重建 better-sqlite3 以匹配当前 Electron 版本。

**注意**: 如果遇到重建错误，请确保安装了：
- **Windows**: Visual Studio Build Tools 或 Visual Studio
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: `build-essential` 包 (`sudo apt-get install build-essential`)

### 运行应用

#### 开发模式运行
```bash
npm start
```

#### 带调试工具运行
```bash
npm run dev
```
这将打开 Chrome DevTools，方便调试。

## 📦 打包应用

### Windows 打包
```bash
npm run build
```
生成的安装包位于：`dist/费用统计器 Setup x.x.x.exe`

### macOS 打包
```bash
npm run build
```
生成的安装包位于：`dist/费用统计器-x.x.x.dmg`

### Linux 打包
```bash
npm run build
```
生成的安装包位于：`dist/费用统计器-x.x.x.AppImage`

## 📖 使用说明

### 1. 设置汇率
1. 在顶部汇率设置区域输入汇率（例如：35.50）
2. 点击"设置汇率"按钮
3. 系统会保存汇率并显示在标题栏

**注意**: 汇率设置后，所有新记录都会使用该汇率进行换算。

### 2. 录入费用

#### 方式一：输入 USDT 金额
1. 选择"USDT 金额"单选按钮
2. 填写日期、姓名、位置
3. 输入 USDT 金额
4. 系统自动显示换算的泰铢金额
5. 点击"添加记录"

#### 方式二：输入泰铢金额
1. 选择"泰铢 (THB) 金额"单选按钮
2. 填写日期、姓名、位置
3. 输入泰铢金额
4. 系统自动显示换算的 USDT 金额
5. 点击"添加记录"

### 3. 查看统计

应用自动显示三种统计维度，每种都包含 USDT 和泰铢双币种：

**总览统计**
- 总记录数
- 总金额（USDT）
- 总金额（THB）

**按日期统计**
- 列出每个日期的费用总额（USDT + THB）
- 显示该日期的记录数
- 按日期降序排列

**按位置统计**
- 列出每个位置的费用总额（USDT + THB）
- 显示该位置的记录数
- 按 USDT 金额降序排列

**按日期和位置统计**
- 显示每个"日期-位置"组合的小计（USDT + THB）
- 显示该组合下的所有记录明细
- 按日期降序、位置升序排列

### 4. 管理记录
- 在"所有记录"表格中查看所有费用
- 每条记录显示：日期、姓名、USDT、泰铢、汇率、位置
- 点击"删除"按钮可删除单条记录（从数据库中永久删除）
- 通过菜单"文件 → 清空所有数据"清空全部数据

### 5. 数据管理功能

#### 导出数据 (`Ctrl+E`)
1. 点击菜单"文件 → 导出数据"
2. 选择保存位置
3. 数据将导出为 JSON 格式，包含：
   - 导出日期
   - 当前汇率
   - 记录总数
   - 所有费用记录

#### 查看数据库信息
1. 点击菜单"文件 → 数据库信息"
2. 查看：
   - 记录总数
   - 数据库文件大小
   - 数据库文件位置

### 6. 数据持久化说明
- ✅ 所有数据自动保存到 SQLite 数据库
- ✅ 应用关闭后数据不会丢失
- ✅ 下次打开自动加载所有历史数据
- ✅ 汇率设置也会保存
- ✅ 支持数据导出备份

## 🎯 使用示例

### 示例 1：设置汇率
```
汇率设置: 1 USDT = 35.50 THB
```

### 示例 2：数据录入（输入 USDT）
```
日期: 2025-01-15
姓名: 张三
USDT: 100.00
位置: 曼谷
→ 自动计算: 3,550.00 THB
```

### 示例 3：数据录入（输入泰铢）
```
日期: 2025-01-15
姓名: 李四
THB: 1,775.00
位置: 曼谷
→ 自动计算: 50.00 USDT
```

### 统计结果示例

假设录入以下数据：
- 2025-01-15, 张三, 100 USDT, 曼谷 (汇率 35.5)
- 2025-01-15, 李四, 50 USDT, 曼谷 (汇率 35.5)
- 2025-01-15, 王五, 80 USDT, 清迈 (汇率 35.5)
- 2025-01-16, 张三, 120 USDT, 曼谷 (汇率 35.5)

**总览**
- 总记录数: 4 条
- 总金额: 350.00 USDT
- 总金额: ฿12,425.00

**按日期统计**
- 2025-01-16
  - USDT: 120.00
  - THB: ฿4,260.00
  - 记录数: 1 条

- 2025-01-15
  - USDT: 230.00
  - THB: ฿8,165.00
  - 记录数: 3 条

**按位置统计**
- 曼谷
  - USDT: 270.00
  - THB: ฿9,585.00
  - 记录数: 3 条

- 清迈
  - USDT: 80.00
  - THB: ฿2,840.00
  - 记录数: 1 条

**按日期和位置统计**
- 2025-01-16 - 曼谷
  - USDT: 120.00
  - THB: ฿4,260.00
  - 明细: 张三: 120.00 USDT / ฿4,260.00

- 2025-01-15 - 曼谷
  - USDT: 150.00
  - THB: ฿5,325.00
  - 明细: 张三: 100.00 USDT / ฿3,550.00, 李四: 50.00 USDT / ฿1,775.00

- 2025-01-15 - 清迈
  - USDT: 80.00
  - THB: ฿2,840.00
  - 明细: 王五: 80.00 USDT / ฿2,840.00

## 🔧 技术架构

### 技术栈
- **Electron**: 跨平台桌面应用框架
- **Node.js**: 后端运行环境
- **SQLite (better-sqlite3)**: 本地数据库引擎
- **原生 JavaScript**: 无额外框架依赖
- **CSS3**: 现代化界面设计

### 数据库架构

#### expenses 表（费用记录表）
```sql
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 记录ID
  date TEXT NOT NULL,                    -- 日期
  name TEXT NOT NULL,                    -- 姓名
  location TEXT NOT NULL,                -- 位置
  usdt REAL NOT NULL,                    -- USDT金额
  thb REAL NOT NULL,                     -- 泰铢金额
  exchange_rate REAL NOT NULL,           -- 汇率
  input_type TEXT NOT NULL,              -- 输入类型(usdt/thb)
  timestamp TEXT NOT NULL,               -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 创建时间
)
```

#### settings 表（设置表）
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,                  -- 设置键
  value TEXT NOT NULL,                   -- 设置值
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 更新时间
)
```

### 架构说明

**主进程（main.js）**
- 窗口管理
- SQLite 数据库管理
- 数据 CRUD 操作
- 汇率管理
- 货币换算逻辑
- IPC 通信处理
- 菜单栏管理
- 数据导出功能

**渲染进程（renderer.js）**
- 用户界面交互
- 表单验证
- 实时货币换算显示
- 数据展示
- 事件处理

**预加载脚本（preload.js）**
- 安全的 IPC 桥接
- API 暴露
- 上下文隔离

### 货币换算算法
```javascript
// USDT 转 THB
thb = usdt * exchangeRate

// THB 转 USDT
usdt = thb / exchangeRate
```

## 🔐 安全特性

- ✅ 启用上下文隔离（contextIsolation）
- ✅ 禁用 Node 集成（nodeIntegration: false）
- ✅ 使用预加载脚本安全通信
- ✅ 最小权限原则

## 📝 常见问题

### Q: 数据存储在哪里？
A: 数据存储在 SQLite 数据库文件中：
- **Windows**: `C:\Users\<用户名>\AppData\Roaming\expense-tracker\expenses.db`
- **macOS**: `~/Library/Application Support/expense-tracker/expenses.db`
- **Linux**: `~/.config/expense-tracker/expenses.db`

可以通过菜单"文件 → 数据库信息"查看具体位置。

### Q: 如何备份数据？
A: 有两种方式：
1. **导出功能**: 菜单 → 文件 → 导出数据（导出为 JSON）
2. **直接复制**: 复制 `expenses.db` 数据库文件

### Q: 如何恢复数据？
A: 
1. 找到数据库文件位置（见上面）
2. 关闭应用
3. 用备份的 `expenses.db` 文件替换当前文件
4. 重新打开应用

### Q: 安装时遇到 better-sqlite3 编译错误？
A: 请确保安装了编译工具：
- **Windows**: 
  ```bash
  npm install --global windows-build-tools
  ```
- **macOS**: 
  ```bash
  xcode-select --install
  ```
- **Linux**: 
  ```bash
  sudo apt-get install build-essential
  ```
然后重新运行 `npm install` 和 `npm run rebuild`

### Q: 菜单显示乱码怎么办？
A: 请确保：
1. 所有文件都保存为 **UTF-8 编码**（不是 UTF-8 with BOM）
2. 使用提供的 `.vscode/settings.json` 和 `.editorconfig` 配置
3. 如果使用记事本编辑，建议改用 VS Code、Sublime Text 或 Notepad++
4. 在 VS Code 中，右下角可以查看和修改文件编码

### Q: 如何检查文件编码？
A: 
- **VS Code**: 查看右下角状态栏，显示 "UTF-8"
- **Notepad++**: 菜单 → 编码 → 选择 "UTF-8"
- **命令行**: `file -i main.js` (Linux/Mac)

### Q: 汇率可以修改吗？
A: 可以。在汇率设置区域输入新汇率并点击"设置汇率"按钮即可。新汇率会应用到之后添加的所有记录。

### Q: 已有记录的汇率会改变吗？
A: 不会。每条记录都保存了当时的汇率，修改汇率不影响历史记录。

### Q: 可以同时输入 USDT 和泰铢吗？
A: 不可以。需要选择一种币种输入，另一种会自动计算。这样可以保证换算的准确性。

### Q: 数据会丢失吗？
A: 不会。所有数据都保存在本地 SQLite 数据库中，即使关闭应用或重启电脑，数据都会保留。建议定期使用"导出数据"功能备份。

### Q: 可以在多台电脑间同步数据吗？
A: 当前版本不支持自动同步。但可以：
1. 导出数据到云盘（如网盘）
2. 或直接复制 `expenses.db` 文件到其他电脑

### Q: 删除记录可以恢复吗？
A: 不可以。删除操作会从数据库中永久删除记录。删除前请谨慎操作，或先导出备份。

### Q: 支持其他货币吗？
A: 当前版本只支持 USDT 和泰铢。如需支持其他货币，需要修改代码。

## 🚀 功能扩展建议

### 可添加的功能
1. ~~**数据持久化**~~ ✅ 已完成
   - ~~使用 SQLite 数据库~~ ✅
   - ~~本地数据存储~~ ✅

2. **数据导入**
   - 从 JSON 文件导入
   - 从 CSV 文件导入
   - 从 Excel 导入

3. **高级导出**
   - 导出为 Excel（双币种）
   - 导出为 PDF 报告
   - 导出为 CSV

4. **高级筛选**
   - 按日期范围筛选
   - 按金额范围筛选
   - 按币种筛选
   - 按姓名筛选

5. **图表展示**
   - 使用 Chart.js 或 ECharts
   - 双币种对比图表
   - 汇率趋势图
   - 费用趋势分析

6. **汇率 API 集成**
   - 自动获取实时汇率
   - 汇率历史记录
   - 多汇率源对比

7. **多币种支持**
   - 支持更多货币对
   - 币种切换功能
   - 多币种统计

8. **记录编辑**
   - 双击编辑记录
   - 批量修改
   - 编辑历史记录

9. **数据分析**
   - 月度报表
   - 年度总结
   - 支出趋势分析
   - 位置支出占比

10. **云同步**
    - WebDAV 同步
    - 私有云同步
    - 多设备数据同步

## 💡 使用技巧

1. **快速输入**: 使用 Tab 键在表单字段间快速切换
2. **键盘操作**: Enter 提交表单，Esc 清空输入
3. **汇率管理**: 建议在每天开始前设置当日汇率
4. **数据备份**: 定期使用"文件 → 导出数据"备份记录

## 📄 许可证

MIT License

## 👨‍💻 作者

根据您的需求定制开发

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**开发日期**: 2025-11-18  
**版本**: 2.1.0 (双币种 + SQLite 持久化版)  
**最后更新**: 2025-11-18

## 🆕 版本更新日志

### v2.1.0 (2025-11-18) - SQLite 持久化
- ✨ **新增 SQLite 数据库支持**
- ✨ 所有数据自动持久化存储
- ✨ 应用关闭后数据不丢失
- ✨ 新增数据导出功能（JSON 格式）
- ✨ 新增数据库信息查看
- ✨ 汇率设置持久化
- 🐛 修复应用重启后数据丢失问题
- 📚 更新文档，增加数据库相关说明

### v2.0.0 (2025-11-18)
- ✨ 新增双币种支持（USDT + 泰铢）
- ✨ 新增汇率设置功能
- ✨ 新增实时货币换算显示
- ✨ 优化统计界面，同时显示双币种
- ✨ 优化记录表格，显示完整币种信息
- 🎨 界面美化，增加币种区分色彩

### v1.0.0 (2025-11-17)
- 🎉 初始版本发布
- ✅ 基础费用记录功能
- ✅ 多维度统计功能
#   e x p e n s e - t r a c k e r  
 