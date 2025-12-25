# 数据库说明文档

## 📊 数据库概述

应用使用 SQLite 作为本地数据库，通过 better-sqlite3 库进行操作。

### 数据库位置

| 操作系统 | 数据库路径 |
|---------|-----------|
| **Windows** | `C:\Users\<用户名>\AppData\Roaming\expense-tracker\expenses.db` |
| **macOS** | `~/Library/Application Support/expense-tracker/expenses.db` |
| **Linux** | `~/.config/expense-tracker/expenses.db` |

## 🗄️ 数据库表结构

### 1. expenses 表（费用记录）

```sql
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  usdt REAL NOT NULL,
  thb REAL NOT NULL,
  exchange_rate REAL NOT NULL,
  input_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**字段说明**：

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | INTEGER | 主键，自动递增 | 1, 2, 3... |
| `date` | TEXT | 费用日期 | "2025-01-15" |
| `name` | TEXT | 报销人姓名 | "张三" |
| `location` | TEXT | 费用发生地点 | "曼谷" |
| `usdt` | REAL | USDT 金额 | 100.50 |
| `thb` | REAL | 泰铢金额 | 3567.75 |
| `exchange_rate` | REAL | 使用的汇率 | 35.50 |
| `input_type` | TEXT | 输入类型 | "usdt" 或 "thb" |
| `timestamp` | TEXT | 记录时间戳 | "2025-01-15T10:30:00.000Z" |
| `created_at` | DATETIME | 数据库记录创建时间 | "2025-01-15 10:30:00" |

### 2. settings 表（系统设置）

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**字段说明**：

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `key` | TEXT | 设置键名（主键） | "exchange_rate" |
| `value` | TEXT | 设置值 | "35.50" |
| `updated_at` | DATETIME | 最后更新时间 | "2025-01-15 10:30:00" |

**当前使用的设置**：
- `exchange_rate`: 当前汇率

## 🔍 常用查询示例

### 查询所有记录
```sql
SELECT * FROM expenses ORDER BY date DESC, id DESC;
```

### 按日期统计
```sql
SELECT 
  date,
  COUNT(*) as count,
  SUM(usdt) as total_usdt,
  SUM(thb) as total_thb
FROM expenses
GROUP BY date
ORDER BY date DESC;
```

### 按位置统计
```sql
SELECT 
  location,
  COUNT(*) as count,
  SUM(usdt) as total_usdt,
  SUM(thb) as total_thb
FROM expenses
GROUP BY location
ORDER BY total_usdt DESC;
```

### 按日期和位置统计
```sql
SELECT 
  date,
  location,
  COUNT(*) as count,
  SUM(usdt) as total_usdt,
  SUM(thb) as total_thb
FROM expenses
GROUP BY date, location
ORDER BY date DESC, location ASC;
```

### 查询指定日期范围
```sql
SELECT * FROM expenses
WHERE date BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY date DESC;
```

### 查询指定位置
```sql
SELECT * FROM expenses
WHERE location = '曼谷'
ORDER BY date DESC;
```

### 查询总计
```sql
SELECT 
  COUNT(*) as total_records,
  SUM(usdt) as total_usdt,
  SUM(thb) as total_thb,
  AVG(usdt) as avg_usdt,
  AVG(thb) as avg_thb
FROM expenses;
```

## 💾 数据备份与恢复

### 备份方法

#### 方法 1: 应用内导出（推荐）
1. 打开应用
2. 菜单 → 文件 → 导出数据
3. 选择保存位置
4. 数据以 JSON 格式导出

#### 方法 2: 直接复制数据库文件
```bash
# Windows
copy "%APPDATA%\expense-tracker\expenses.db" "D:\backup\expenses_backup_2025-01-15.db"

# macOS/Linux
cp ~/Library/Application\ Support/expense-tracker/expenses.db ~/backup/expenses_backup_2025-01-15.db
```

### 恢复方法

#### 方法 1: 从数据库文件恢复
1. 关闭应用
2. 找到数据库文件位置
3. 用备份文件替换当前文件
4. 重新打开应用

```bash
# Windows
copy "D:\backup\expenses_backup_2025-01-15.db" "%APPDATA%\expense-tracker\expenses.db"

# macOS/Linux
cp ~/backup/expenses_backup_2025-01-15.db ~/Library/Application\ Support/expense-tracker/expenses.db
```

## 🛠️ 数据库维护

### 查看数据库大小
```bash
# Windows
dir "%APPDATA%\expense-tracker\expenses.db"

# macOS/Linux
ls -lh ~/Library/Application\ Support/expense-tracker/expenses.db
```

或在应用内：菜单 → 文件 → 数据库信息

### 优化数据库（减小文件大小）
```sql
VACUUM;
```

可以使用 SQLite 命令行工具执行：
```bash
sqlite3 expenses.db "VACUUM;"
```

### 检查数据库完整性
```sql
PRAGMA integrity_check;
```

应该返回 "ok"。

## 🔒 数据安全建议

1. **定期备份**
   - 建议每周备份一次数据库文件
   - 使用"导出数据"功能创建 JSON 备份

2. **多地备份**
   - 本地备份：复制到其他硬盘
   - 云端备份：上传到网盘
   - 移动备份：复制到 U 盘

3. **版本控制**
   - 备份文件命名包含日期：`expenses_backup_2025-01-15.db`
   - 保留多个历史版本

4. **加密保护**
   - 如需加密，可以使用文件加密工具
   - 或将整个应用数据目录加密

## 🔧 高级操作

### 使用 SQLite 命令行工具

#### 安装 SQLite
```bash
# Windows: 从 https://sqlite.org/download.html 下载
# macOS: 已预装
# Linux: sudo apt-get install sqlite3
```

#### 连接数据库
```bash
# Windows
cd %APPDATA%\expense-tracker
sqlite3 expenses.db

# macOS/Linux
cd ~/Library/Application\ Support/expense-tracker
sqlite3 expenses.db
```

#### 常用命令
```sql
-- 显示所有表
.tables

-- 显示表结构
.schema expenses

-- 导出为 SQL 文件
.output backup.sql
.dump
.output stdout

-- 导出为 CSV
.headers on
.mode csv
.output expenses.csv
SELECT * FROM expenses;
.output stdout

-- 退出
.quit
```

### 数据导入（从 JSON）

如果你有从应用导出的 JSON 文件，可以编写脚本导入：

```javascript
const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database('expenses.db');

const data = JSON.parse(fs.readFileSync('expenses_export.json', 'utf-8'));

const insert = db.prepare(`
  INSERT INTO expenses (date, name, location, usdt, thb, exchange_rate, input_type, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((expenses) => {
  for (const expense of expenses) {
    insert.run(
      expense.date,
      expense.name,
      expense.location,
      expense.usdt,
      expense.thb,
      expense.exchange_rate,
      expense.input_type,
      expense.timestamp
    );
  }
});

insertMany(data.expenses);
console.log(`导入了 ${data.expenses.length} 条记录`);
```

## 📈 性能优化

### 索引建议

对于大量数据（10000+ 条记录），可以创建索引：

```sql
-- 日期索引
CREATE INDEX idx_date ON expenses(date);

-- 位置索引
CREATE INDEX idx_location ON expenses(location);

-- 组合索引
CREATE INDEX idx_date_location ON expenses(date, location);
```

### 查询优化
- 使用 `LIMIT` 限制返回结果数量
- 使用 `WHERE` 子句过滤数据
- 避免 `SELECT *`，只查询需要的字段

## 🚨 故障排查

### 问题 1: 数据库文件损坏
```bash
# 检查完整性
sqlite3 expenses.db "PRAGMA integrity_check;"

# 如果损坏，尝试恢复
sqlite3 expenses.db ".recover" > recovered.sql
sqlite3 new_expenses.db < recovered.sql
```

### 问题 2: 无法写入数据库
- 检查文件权限
- 确保磁盘空间充足
- 关闭其他可能锁定数据库的程序

### 问题 3: 数据丢失
- 从备份恢复
- 检查是否在正确的数据库文件位置

## 📚 相关资源

- [SQLite 官方文档](https://sqlite.org/docs.html)
- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3/wiki)
- [SQL 教程](https://www.sqlitetutorial.net/)
