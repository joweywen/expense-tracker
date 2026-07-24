// -*- coding: utf-8 -*-

// 强制在 app 加载任何东西之前禁用硬件加速
const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

// 禁用硬件加速
app.disableHardwareAcceleration();
process.env.LANG = 'zh_CN.UTF-8';

let mainWindow;
let rateReminderWindow;
let db;
let exchangeRateUsdtThb = 35.5;
let exchangeRateRmbThb = 4.9;
let exchangeRateUsdtRmb = 7.24;
let lastReminderDate = null;

// 初始化数据库
function initDatabase() {
  try {
    // 1. 获取存放数据库的正确路径
    const userDataPath = app.getPath('userData');

    // 2. 确保路径是完整且合法的 Windows 路径
    const dbPath = path.resolve(userDataPath, 'expenses.db');

    console.log("数据库路径:", dbPath);

    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // 3. 初始化数据库
    db = new Database(dbPath);

    // 自动检查并创建表 (已删除非法的 SQL 注释)
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
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        exchange_type TEXT NOT NULL,
        reserve_date TEXT NOT NULL,
        delivery_type TEXT NOT NULL,
        location TEXT,
        usdt_amount REAL DEFAULT 0,
        rmb_amount REAL DEFAULT 0,
        thb_amount REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 加载设置
    const loadSetting = (key, defaultVal) => {
      const res = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      if (res) return parseFloat(res.value);
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, defaultVal.toString());
      return defaultVal;
    };

    exchangeRateUsdtThb = loadSetting('exchange_rate_usdt_thb', 35.5);
    exchangeRateRmbThb = loadSetting('exchange_rate_rmb_thb', 4.9);
    exchangeRateUsdtRmb = loadSetting('exchange_rate_usdt_rmb', 7.24);

    console.log('数据库初始化成功');
  } catch (error) {
    console.error("数据库初始化报错:", error);
    dialog.showErrorBox('数据库错误', '路径解析错误，请删除 AppData 下的残留数据后重试：\n' + error.message);
    app.quit();
  }
}

// 创建窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    },
    title: '费用统计器 - 完整修正版'
  });
  mainWindow.loadFile('index.html');
}

// --- IPC 处理 ---

ipcMain.handle('get-exchange-rate', async () => ({
  usdtThb: exchangeRateUsdtThb,
  rmbThb: exchangeRateRmbThb,
  usdtRmb: exchangeRateUsdtRmb
}));

ipcMain.handle('set-exchange-rate', async (event, rates) => {
  if (rates.usdtThb) {
    exchangeRateUsdtThb = parseFloat(rates.usdtThb);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('exchange_rate_usdt_thb', exchangeRateUsdtThb.toString());
  }
  if (rates.rmbThb) {
    exchangeRateRmbThb = parseFloat(rates.rmbThb);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('exchange_rate_rmb_thb', exchangeRateRmbThb.toString());
  }
  return { success: true };
});

ipcMain.handle('add-expense', async (event, expense) => {
  try {
    const { usdt, thb, rmb, inputType } = calculateExpenseAmounts(expense);

    db.prepare(`
      INSERT INTO expenses (date, name, location, usdt, thb, rmb, exchange_rate_usdt_thb, exchange_rate_rmb_thb, input_type, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(expense.date, expense.name, expense.location, usdt, thb, rmb, exchangeRateUsdtThb, exchangeRateRmbThb, inputType, new Date().toISOString());

    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

function calculateExpenseAmounts(expense) {
  const inputType = expense.inputType;
  let usdt, thb, rmb;
  if (inputType === 'usdt') {
    usdt = Number(expense.usdt);
    thb = usdt * exchangeRateUsdtThb;
    rmb = usdt * exchangeRateUsdtRmb;
  } else if (inputType === 'rmb') {
    rmb = Number(expense.rmb);
    thb = rmb * exchangeRateRmbThb;
    usdt = rmb / exchangeRateUsdtRmb;
  } else if (inputType === 'thb') {
    thb = Number(expense.thb);
    usdt = thb / exchangeRateUsdtThb;
    rmb = thb / exchangeRateRmbThb;
  } else {
    throw new Error('无效的金额币种');
  }
  if (!expense.date || !expense.name?.trim() || !expense.location?.trim() || !Number.isFinite(usdt) || usdt <= 0) {
    throw new Error('请完整填写日期、姓名、位置和有效金额');
  }
  return { usdt, thb, rmb, inputType };
}

function buildExpenseQuery(filters = {}) {
  const conditions = [];
  const params = [];
  if (filters.startDate) { conditions.push('date >= ?'); params.push(filters.startDate); }
  if (filters.endDate) { conditions.push('date <= ?'); params.push(filters.endDate); }
  if (filters.name) { conditions.push('name LIKE ? COLLATE NOCASE'); params.push(`%${filters.name.trim()}%`); }
  if (filters.location) { conditions.push('location LIKE ? COLLATE NOCASE'); params.push(`%${filters.location.trim()}%`); }
  return { where: conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '', params };
}

ipcMain.handle('get-expenses', async (event, dateRange) => {
  try {
    const { where, params } = buildExpenseQuery(dateRange);
    let sql = `SELECT * FROM expenses${where}`;
    sql += ' ORDER BY date DESC, id DESC';
    const rows = db.prepare(sql).all(...params);

    return rows.map(row => {
      const rUsdtThb = row.exchange_rate_usdt_thb || exchangeRateUsdtThb;
      const rRmbThb = row.exchange_rate_rmb_thb || exchangeRateRmbThb;
      if (!row.usdt) row.usdt = row.thb / rUsdtThb;
      if (!row.rmb) row.rmb = row.thb / rRmbThb;
      return row;
    });
  } catch (e) { return []; }
});

ipcMain.handle('calculate-statistics', async (event, dateRange) => {
  try {
    const { where, params } = buildExpenseQuery(dateRange);
    const sql = `SELECT * FROM expenses${where}`;
    const rows = db.prepare(sql).all(...params);

    const stats = { byDate: {}, byLocation: {}, byDateAndLocation: {}, totalUsdt: 0, totalThb: 0, totalRmb: 0, totalCount: rows.length };

    rows.forEach(item => {
      const rUsdtThb = item.exchange_rate_usdt_thb || exchangeRateUsdtThb;
      const rRmbThb = item.exchange_rate_rmb_thb || exchangeRateRmbThb;

      let vUsdt = item.usdt || (item.thb / rUsdtThb);
      let vThb = item.thb;
      let vRmb = item.rmb || (item.thb / rRmbThb);

      stats.totalUsdt += vUsdt;
      stats.totalThb += vThb;
      stats.totalRmb += vRmb;

      const update = (obj, key) => {
        if (!obj[key]) {
          obj[key] = {
            totalUsdt: 0,
            totalThb: 0,
            totalRmb: 0,
            count: 0,
            // 必须显式添加这两个字段，否则前端拿不到
            date: item.date,
            location: item.location
          };
        }
        obj[key].totalUsdt += vUsdt;
        obj[key].totalThb += vThb;
        obj[key].totalRmb += vRmb;
        obj[key].count += 1;
      };

      update(stats.byDate, item.date);
      update(stats.byLocation, item.location);
      update(stats.byDateAndLocation, `${item.date}_${item.location}`);
    });

    return stats;
  } catch (e) { return { totalCount: 0 }; }
});

ipcMain.handle('delete-expense', async (event, id) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('update-expense', async (event, expense) => {
  try {
    if (!Number.isInteger(Number(expense.id))) throw new Error('无效的记录 ID');
    const { usdt, thb, rmb, inputType } = calculateExpenseAmounts(expense);
    const result = db.prepare(`
      UPDATE expenses
      SET date = ?, name = ?, location = ?, usdt = ?, thb = ?, rmb = ?,
          exchange_rate_usdt_thb = ?, exchange_rate_rmb_thb = ?, input_type = ?, timestamp = ?
      WHERE id = ?
    `).run(expense.date, expense.name.trim(), expense.location.trim(), usdt, thb, rmb,
      exchangeRateUsdtThb, exchangeRateRmbThb, inputType, new Date().toISOString(), Number(expense.id));
    if (!result.changes) throw new Error('未找到要修改的记录');
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('get-rank-data', async (event, { type, limit = 10 }) => {
  try {
    let sql = "";
    if (type === 'name') sql = `SELECT name as label, SUM(thb) as total_thb FROM expenses GROUP BY name ORDER BY total_thb DESC LIMIT ${limit}`;
    else if (type === 'location') sql = `SELECT location as label, SUM(thb) as total_thb FROM expenses GROUP BY location ORDER BY total_thb DESC LIMIT ${limit}`;
    else sql = `SELECT (name || '-' || location) as label, thb as total_thb FROM expenses ORDER BY thb DESC LIMIT ${limit}`;

    const data = db.prepare(sql).all();
    return data.map(d => ({ label: d.label, value: d.total_thb / exchangeRateUsdtThb }));
  } catch (e) { return []; }
});

ipcMain.handle('get-suggestions', async () => {
  const names = db.prepare(`SELECT name FROM expenses UNION SELECT name FROM reservations`).all().map(r => r.name);
  const locs = db.prepare(`SELECT location FROM expenses UNION SELECT location FROM reservations`).all().map(r => r.location);
  return { names, locations: locs };
});

ipcMain.handle('set-usdt-rmb-rate', async (event, rate) => {
  exchangeRateUsdtRmb = parseFloat(rate);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('exchange_rate_usdt_rmb', rate.toString());
  return { success: true };
});

ipcMain.handle('get-default-date-range', async () => {
  const today = new Date();
  const day = today.getDate();
  let start = new Date(today.getFullYear(), today.getMonth() - (day > 26 ? 0 : 1), 27);
  let end = new Date(today.getFullYear(), today.getMonth() + (day > 26 ? 1 : 0), 26);
  const fmt = d => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
});

ipcMain.handle('add-reservation', async (event, data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO reservations (name, exchange_type, reserve_date, delivery_type, location, usdt_amount, rmb_amount, thb_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(data.name, data.type, data.date, data.delivery, data.location, data.usdt || 0, data.rmb || 0, data.thb || 0);
    return { success: true };
  } catch (e) {
    console.error('保存预约失败:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-reservations', async (event, date) => {
  try {
    const records = db.prepare('SELECT * FROM reservations WHERE reserve_date = ? ORDER BY id DESC').all(date);
    const stats = db.prepare(`
      SELECT SUM(usdt_amount) as totalUsdt, SUM(rmb_amount) as totalRmb, SUM(thb_amount) as totalThb 
      FROM reservations WHERE reserve_date = ?
    `).get(date);
    return {
      records,
      stats: { totalUsdt: stats.totalUsdt || 0, totalRmb: stats.totalRmb || 0, totalThb: stats.totalThb || 0 }
    };
  } catch (e) {
    return { records: [], stats: { totalUsdt: 0, totalRmb: 0, totalThb: 0 } };
  }
});

ipcMain.handle('delete-reservation', async (event, id) => {
  db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
  return { success: true };
});

app.whenReady().then(() => {
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') app.quit();
});
