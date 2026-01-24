// -*- coding: utf-8 -*-
const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

// 禁用硬件加速（解决 GPU 进程错误）
app.disableHardwareAcceleration();

// 设置默认编码
process.env.LANG = 'zh_CN.UTF-8';

let mainWindow;
let rateReminderWindow;
let db;
let exchangeRateUsdtThb = 35.5; // USDT 到 THB 汇率
let exchangeRateRmbThb = 4.9;    // RMB 到 THB 汇率 <--- 已修正潜在的特殊空格
let lastReminderDate = null;     // 上次提醒日期      <--- 已修正潜在的特殊空格

// 初始化数据库
function initDatabase() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'expenses.db');
    console.log('数据库路径:', dbPath);

    // 确保目录存在
    const fs = require('fs');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);

    // 检查表是否存在以及结构
    try {
      const tableInfo = db.prepare("PRAGMA table_info(expenses)").all();
      const hasRmbColumn = tableInfo.some(col => col.name === 'rmb');
      const hasUsdtThbRate = tableInfo.some(col => col.name === 'exchange_rate_usdt_thb');

      if (tableInfo.length > 0 && (!hasRmbColumn || !hasUsdtThbRate)) {
        console.log('检测到旧版本数据库，开始迁移...');
        migrateDatabase();
      }
    } catch (err) {
      console.log('表不存在，将创建新表');
    }

    // 创建或确保表存在
    // FIX: 使用模板字符串 (backticks `) 替换双引号 (") 来支持多行 SQL
    db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        usdt REAL,
        thb REAL NOT NULL,
        rmb REAL,
        exchange_rate_usdt_thb REAL,
        exchange_rate_rmb_thb REAL,
        input_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建汇率设置表
    // FIX: 使用模板字符串 (backticks `) 替换双引号 (") 来支持多行 SQL
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 读取保存的汇率
    try {
      const usdtThbRate = db.prepare('SELECT value FROM settings WHERE key = ?').get('exchange_rate_usdt_thb');
      if (usdtThbRate) {
        exchangeRateUsdtThb = parseFloat(usdtThbRate.value);
      } else {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('exchange_rate_usdt_thb', exchangeRateUsdtThb.toString());
      }

      const rmbThbRate = db.prepare('SELECT value FROM settings WHERE key = ?').get('exchange_rate_rmb_thb');
      if (rmbThbRate) {
        exchangeRateRmbThb = parseFloat(rmbThbRate.value);
      } else {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('exchange_rate_rmb_thb', exchangeRateRmbThb.toString());
      }
    } catch (err) {
      console.log('读取汇率失败，使用默认值:', err);
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('exchange_rate_usdt_thb', exchangeRateUsdtThb.toString());
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('exchange_rate_rmb_thb', exchangeRateRmbThb.toString());
    }

    console.log('数据库初始化完成');
    console.log('USDT->THB 汇率:', exchangeRateUsdtThb);
    console.log('RMB->THB 汇率:', exchangeRateRmbThb);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    dialog.showErrorBox('数据库错误', '无法初始化数据库:\n' + error.message);
    app.quit();
  }
}

// 数据库迁移函数
function migrateDatabase() {
  console.log('开始数据库迁移...');

  try {
    // 1. 重命名旧表
    db.exec('ALTER TABLE expenses RENAME TO expenses_old');

    // 2. 创建新表结构
    db.exec(`
      CREATE TABLE expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        usdt REAL,
        thb REAL NOT NULL,
        rmb REAL,
        exchange_rate_usdt_thb REAL,
        exchange_rate_rmb_thb REAL,
        input_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. 迁移数据
    const oldData = db.prepare('SELECT * FROM expenses_old').all();
    console.log(`迁移 ${oldData.length} 条记录...`);

    const insertStmt = db.prepare(`
      INSERT INTO expenses (
        id, date, name, location, usdt, thb, rmb, 
        exchange_rate_usdt_thb, exchange_rate_rmb_thb, 
        input_type, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const migrate = db.transaction((records) => {
      for (const record of records) {
        insertStmt.run(
          record.id,
          record.date,
          record.name,
          record.location,
          record.usdt || null,
          record.thb,
          null, // rmb 新字段，旧记录设为 null
          record.exchange_rate || exchangeRateUsdtThb, // 兼容旧字段名
          exchangeRateRmbThb, // 新汇率字段
          record.input_type,
          record.timestamp,
          record.created_at || new Date().toISOString()
        );
      }
    });

    migrate(oldData);

    // 4. 删除旧表
    db.exec('DROP TABLE expenses_old');

    console.log('数据库迁移完成！');

    // 显示迁移成功提示
    dialog.showMessageBox(null, {
      type: 'info',
      title: '数据库升级',
      message: '数据库已成功升级到新版本',
      detail: `已迁移 ${oldData.length} 条记录\n现在支持三币种（USDT/RMB/THB）`
    });

  } catch (error) {
    console.error('数据库迁移失败:', error);

    // 尝试恢复
    try {
      db.exec('DROP TABLE IF EXISTS expenses');
      db.exec('ALTER TABLE expenses_old RENAME TO expenses');
      console.log('已恢复旧表');
    } catch (restoreError) {
      console.error('恢复失败:', restoreError);
    }

    dialog.showErrorBox('数据库迁移失败',
      '无法升级数据库到新版本。\n' +
      '建议：\n' +
      '1. 导出现有数据（如果可以）\n' +
      '2. 删除数据库文件重新开始\n\n' +
      '错误信息：' + error.message
    );
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: '费用统计器 - 双币种版'
  });

  mainWindow.loadFile('index.html');

  // 开发环境打开开发者工具
  if (process.argv.includes('--inspect=5858')) {
    mainWindow.webContents.openDevTools();
  }

  // 创建菜单
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS 特有的应用菜单
    ...(isMac ? [{
      label: '费用统计器',
      submenu: [
        { label: '关于', role: 'about' },
        { type: 'separator' },
        { label: '服务', role: 'services' },
        { type: 'separator' },
        { label: '隐藏', role: 'hide' },
        { label: '隐藏其他', role: 'hideOthers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    }] : []),
    // 文件菜单
    {
      label: '文件',
      submenu: [
        {
          label: '导出数据',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            exportData();
          }
        },
        { type: 'separator' },
        {
          label: '清空所有数据',
          accelerator: 'CmdOrCtrl+Shift+Delete',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['取消', '确定'],
              defaultId: 0,
              title: '确认操作',
              message: '确定要清空所有数据吗？',
              detail: '此操作不可恢复！数据库中的所有记录都将被删除。'
            }).then(result => {
              if (result.response === 1) {
                db.prepare('DELETE FROM expenses').run();
                mainWindow.webContents.send('data-cleared');
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: '操作成功',
                  message: '所有数据已清空'
                });
              }
            });
          }
        },
        {
          label: '数据库信息',
          click: () => {
            const count = db.prepare('SELECT COUNT(*) as count FROM expenses').get();
            const dbSize = require('fs').statSync(path.join(app.getPath('userData'), 'expenses.db')).size;
            const sizeInKB = (dbSize / 1024).toFixed(2);

            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '数据库信息',
              message: '数据库统计',
              detail: `记录总数: ${count.count} 条\n数据库大小: ${sizeInKB} KB\n数据库位置: ${path.join(app.getPath('userData'), 'expenses.db')}`
            });
          }
        },
        { type: 'separator' },
        isMac ?
          { label: '关闭窗口', role: 'close' } :
          { label: '退出', role: 'quit' }
      ]
    },
    // 编辑菜单
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        ...(isMac ? [
          { label: '粘贴并匹配样式', role: 'pasteAndMatchStyle' },
          { label: '删除', role: 'delete' },
          { label: '全选', role: 'selectAll' }
        ] : [
          { label: '删除', role: 'delete' },
          { type: 'separator' },
          { label: '全选', role: 'selectAll' }
        ])
      ]
    },
    // 视图菜单
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    // 窗口菜单
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '缩放', role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { label: '前置所有窗口', role: 'front' }
        ] : [
          { label: '关闭', role: 'close' }
        ])
      ]
    },
    // 帮助菜单
    {
      label: '帮助',
      submenu: [
        {
          label: '使用说明',
          click: () => {
            mainWindow.webContents.send('show-help');
          }
        },
        { type: 'separator' },
        {
          label: '关于应用',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '费用统计器 v2.1.0',
              detail: '支持USDT和泰铢双币种的费用管理系统\n数据持久化存储到SQLite数据库\n\n© 2025 保留所有权利'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 导出数据功能
function exportData() {
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();

  if (expenses.length === 0) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '提示',
      message: '没有数据可导出'
    });
    return;
  }

  dialog.showSaveDialog(mainWindow, {
    title: '导出数据',
    defaultPath: `expenses_${new Date().toISOString().split('T')[0]}.json`,
    filters: [
      { name: 'JSON 文件', extensions: ['json'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      const fs = require('fs');
      const data = {
        exportDate: new Date().toISOString(),
        // 注意: 这里的 exchangeRate 变量可能是旧版本遗留的，应该使用新的 usdt/rmb 汇率
        exchangeRates: {
          usdtThb: exchangeRateUsdtThb,
          rmbThb: exchangeRateRmbThb
        },
        totalRecords: expenses.length,
        expenses: expenses
      };

      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');

      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '导出成功',
        message: `已成功导出 ${expenses.length} 条记录到：\n${result.filePath}`
      });
    }
  });
}

// 计算默认日期区间（账期：27号到下月26号）
ipcMain.handle('get-default-date-range', async () => {
  const today = new Date();
  const currentDay = today.getDate();
  let startDate, endDate;

  if (currentDay > 26) {
    // 当天大于26号：当前月27号 至 下月26号
    startDate = new Date(today.getFullYear(), today.getMonth(), 27);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 26);
  } else {
    // 当天小于等于26号：上月27号 至 当前月26号
    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 27);
    endDate = new Date(today.getFullYear(), today.getMonth(), 26);
  }

  // 格式化为 YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
});

// 设置新的汇率
// 修复了 ReferenceError: rates is not defined 的问题，将代码块包裹在正确的 ipcMain.handle 中
ipcMain.handle('set-exchange-rate', async (event, rates) => {
  try {
    if (rates.usdtThb !== undefined) {
      exchangeRateUsdtThb = parseFloat(rates.usdtThb);
      db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
        .run('exchange_rate_usdt_thb', exchangeRateUsdtThb.toString());
    }

    if (rates.rmbThb !== undefined) {
      exchangeRateRmbThb = parseFloat(rates.rmbThb);
      db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
        .run('exchange_rate_rmb_thb', exchangeRateRmbThb.toString());
    }

    return {
      success: true,
      usdtThb: exchangeRateUsdtThb,
      rmbThb: exchangeRateRmbThb
    };
  } catch (error) {
    console.error('设置汇率失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取当前汇率
ipcMain.handle('get-exchange-rate', async () => {
  return {
    usdtThb: exchangeRateUsdtThb,
    rmbThb: exchangeRateRmbThb
  };
});

// 添加费用记录
ipcMain.handle('add-expense', async (event, expense) => {
  try {
    let usdt = null, thb = 0, rmb = null;

    if (expense.inputType === 'usdt') {
      usdt = parseFloat(expense.usdt);
      thb = usdt * exchangeRateUsdtThb;
    } else if (expense.inputType === 'rmb') {
      rmb = parseFloat(expense.rmb);
      thb = rmb * exchangeRateRmbThb;
    } else {
      thb = parseFloat(expense.thb);
    }

    const stmt = db.prepare(`
      INSERT INTO expenses (date, name, location, usdt, thb, rmb, exchange_rate_usdt_thb, exchange_rate_rmb_thb, input_type, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      expense.date,
      expense.name,
      expense.location,
      usdt,
      thb,
      rmb,
      exchangeRateUsdtThb,
      exchangeRateRmbThb,
      expense.inputType,
      new Date().toISOString()
    );

    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('添加记录失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取所有费用记录
ipcMain.handle('get-expenses', async (event, dateRange) => {
  try {
    console.log('开始查询所有记录...', dateRange);

    let query = 'SELECT * FROM expenses';
    let params = [];

    if (dateRange && dateRange.startDate && dateRange.endDate) {
      query += ' WHERE date BETWEEN ? AND ?';
      params = [dateRange.startDate, dateRange.endDate];
    }

    query += ' ORDER BY date DESC, id DESC';

    const expenses = db.prepare(query).all(...params);
    console.log('查询到记录数:', expenses.length);

    // 检查并修复缺失的字段
    const fixedExpenses = expenses.map(expense => {
      if (!expense.exchange_rate_usdt_thb) {
        expense.exchange_rate_usdt_thb = exchangeRateUsdtThb;
      }
      if (!expense.exchange_rate_rmb_thb) {
        expense.exchange_rate_rmb_thb = exchangeRateRmbThb;
      }
      return expense;
    });

    return fixedExpenses;
  } catch (error) {
    console.error('获取记录失败:', error);
    console.error('错误详情:', error.message);
    return [];
  }
});

// 删除费用记录
ipcMain.handle('delete-expense', async (event, id) => {
  try {
    const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

    if (result.changes > 0) {
      return { success: true };
    } else {
      return { success: false, error: '记录不存在' };
    }
  } catch (error) {
    console.error('删除记录失败:', error);
    return { success: false, error: error.message };
  }
});

// 计算统计数据
ipcMain.handle('calculate-statistics', async (event, dateRange) => {
  try {
    console.log('开始计算统计数据...', dateRange);

    let query = 'SELECT * FROM expenses';
    let params = [];

    if (dateRange && dateRange.startDate && dateRange.endDate) {
      query += ' WHERE date BETWEEN ? AND ?';
      params = [dateRange.startDate, dateRange.endDate];
    }

    query += ' ORDER BY date DESC, id DESC';

    const expenses = db.prepare(query).all(...params);
    console.log('用于统计的记录数:', expenses.length);

    if (expenses.length === 0) {
      console.log('没有记录，返回空统计');
      return {
        byDate: {},
        byLocation: {},
        byDateAndLocation: {},
        totalUsdt: 0,
        totalThb: 0,
        totalRmb: 0,
        totalCount: 0,
        currentExchangeRates: {
          usdtThb: exchangeRateUsdtThb,
          rmbThb: exchangeRateRmbThb
        }
      };
    }

    const byDate = {};
    const byLocation = {};
    const byDateAndLocation = {};

    // 计算统一的总额（三个币种互相换算后相加）
    let totalInUsdt = 0;  // 以 USDT 为基准
    let totalInRmb = 0;   // 以 RMB 为基准
    let totalInThb = 0;   // 以 THB 为基准

    expenses.forEach(item => {
      // 获取当时的汇率（使用记录保存的汇率，如果没有则使用当前汇率）
      const rateUsdtThb = item.exchange_rate_usdt_thb || exchangeRateUsdtThb;
      const rateRmbThb = item.exchange_rate_rmb_thb || exchangeRateRmbThb;

      // 计算每条记录换算到三种币种的等价值
      let recordInUsdt = 0;
      let recordInRmb = 0;
      let recordInThb = 0;

      if (item.usdt) {
        // 如果输入的是 USDT
        recordInUsdt = item.usdt;
        recordInThb = item.usdt * rateUsdtThb;
        recordInRmb = recordInThb / rateRmbThb;
      } else if (item.rmb) {
        // 如果输入的是 RMB
        recordInRmb = item.rmb;
        recordInThb = item.rmb * rateRmbThb;
        recordInUsdt = recordInThb / rateUsdtThb;
      } else {
        // 如果输入的是 THB
        recordInThb = item.thb;
        recordInUsdt = item.thb / rateUsdtThb;
        recordInRmb = item.thb / rateRmbThb;
      }

      // 累加到总额
      totalInUsdt += recordInUsdt;
      totalInRmb += recordInRmb;
      totalInThb += recordInThb;

      // 按日期统计
      if (!byDate[item.date]) {
        byDate[item.date] = {
          totalUsdt: 0,
          totalThb: 0,
          totalRmb: 0,
          count: 0,
          records: []
        };
      }
      byDate[item.date].totalUsdt += recordInUsdt;
      byDate[item.date].totalThb += recordInThb;
      byDate[item.date].totalRmb += recordInRmb;
      byDate[item.date].count += 1;
      byDate[item.date].records.push(item);

      // 按位置统计
      if (!byLocation[item.location]) {
        byLocation[item.location] = {
          totalUsdt: 0,
          totalThb: 0,
          totalRmb: 0,
          count: 0,
          records: []
        };
      }
      byLocation[item.location].totalUsdt += recordInUsdt;
      byLocation[item.location].totalThb += recordInThb;
      byLocation[item.location].totalRmb += recordInRmb;
      byLocation[item.location].count += 1;
      byLocation[item.location].records.push(item);

      // 按日期和位置统计
      const key = `${item.date}_${item.location}`;
      if (!byDateAndLocation[key]) {
        byDateAndLocation[key] = {
          date: item.date,
          location: item.location,
          totalUsdt: 0,
          totalThb: 0,
          totalRmb: 0,
          count: 0,
          records: []
        };
      }
      byDateAndLocation[key].totalUsdt += recordInUsdt;
      byDateAndLocation[key].totalThb += recordInThb;
      byDateAndLocation[key].totalRmb += recordInRmb;
      byDateAndLocation[key].count += 1;
      byDateAndLocation[key].records.push(item);
    });

    const result = {
      byDate,
      byLocation,
      byDateAndLocation,
      totalUsdt: totalInUsdt,
      totalThb: totalInThb,
      totalRmb: totalInRmb,
      totalCount: expenses.length,
      currentExchangeRates: {
        usdtThb: exchangeRateUsdtThb,
        rmbThb: exchangeRateRmbThb
      }
    };

    console.log('统计计算完成:', {
      按日期: Object.keys(byDate).length,
      按位置: Object.keys(byLocation).length,
      按日期位置: Object.keys(byDateAndLocation).length,
      总记录: result.totalCount,
      总额USDT: totalInUsdt.toFixed(2),
      总额RMB: totalInRmb.toFixed(2),
      总额THB: totalInThb.toFixed(2)
    });

    return result;
  } catch (error) {
    console.error('计算统计失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    return {
      byDate: {},
      byLocation: {},
      byDateAndLocation: {},
      totalUsdt: 0,
      totalThb: 0,
      totalRmb: 0,
      totalCount: 0,
      currentExchangeRates: {
        usdtThb: exchangeRateUsdtThb,
        rmbThb: exchangeRateRmbThb
      }
    };
  }
});

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  // 启动汇率提醒定时器
  startRateReminderTimer();
});

// 汇率提醒定时器
function startRateReminderTimer() {
  // 立即检查一次（如果是9点后启动）
  checkAndShowRateReminder();

  // 每分钟检查一次
  setInterval(() => {
    checkAndShowRateReminder();
  }, 60000); // 60秒
}

// 检查并显示汇率提醒
function checkAndShowRateReminder() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toDateString();

  // 检查是否是9点，且今天还没有提醒过
  if (currentHour === 9 && lastReminderDate !== currentDate) {
    lastReminderDate = currentDate;
    showRateReminderWindow();
  }
}

// 显示汇率提醒窗口
function showRateReminderWindow() {
  // 如果窗口已存在，先关闭
  if (rateReminderWindow && !rateReminderWindow.isDestroyed()) {
    rateReminderWindow.close();
  }

  rateReminderWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    modal: true,
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: '每日汇率更新提醒',
    alwaysOnTop: true
  });

  rateReminderWindow.loadFile('rate-reminder.html');

  rateReminderWindow.on('closed', () => {
    rateReminderWindow = null;
  });
}

// 处理汇率提醒窗口的更新
ipcMain.handle('update-daily-rates', async (event, rates) => {
  try {
    // 调用 set-exchange-rate 处理器来更新汇率并保存到数据库
    // 注意: 由于 set-exchange-rate 已经是 ipcMain.handle，我们不能直接 emit，而是直接调用其逻辑
    // 考虑到 set-exchange-rate 的逻辑已经被正确包裹，我们在这里手动调用一次其内部逻辑，或者如果需要使用 IPC 机制，应该在渲染进程中触发

    // 直接执行更新逻辑，而不是通过 emit/handle
    exchangeRateUsdtThb = parseFloat(rates.usdtThb);
    exchangeRateRmbThb = parseFloat(rates.rmbThb);

    db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run('exchange_rate_usdt_thb', exchangeRateUsdtThb.toString());
    db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run('exchange_rate_rmb_thb', exchangeRateRmbThb.toString());

    // 记录今日已更新
    db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run('last_rate_update', new Date().toDateString());

    // 通知主窗口汇率已更新
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('rates-updated', {
        usdtThb: exchangeRateUsdtThb,
        rmbThb: exchangeRateRmbThb
      });
    }

    // 关闭提醒窗口
    if (rateReminderWindow && !rateReminderWindow.isDestroyed()) {
      rateReminderWindow.close();
    }

    return { success: true };
  } catch (error) {
    console.error('更新每日汇率失败:', error);
    return { success: false, error: error.message };
  }
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 应用退出时关闭数据库
app.on('will-quit', () => {
  if (db) {
    db.close();
  }
});
