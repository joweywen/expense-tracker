// -*- coding: utf-8 -*-
const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

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
    const dbPath = path.join(app.getPath('userData'), 'expenses.db');
    const fs = require('fs');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    db = new Database(dbPath);

    // 自动检查并创建表
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
    dialog.showErrorBox('数据库错误', error.message);
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

// 获取汇率
ipcMain.handle('get-exchange-rate', async () => ({
  usdtThb: exchangeRateUsdtThb,
  rmbThb: exchangeRateRmbThb,
  usdtRmb: exchangeRateUsdtRmb
}));

// 设置汇率
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

// 添加记录
ipcMain.handle('add-expense', async (event, expense) => {
  try {
    let usdt = null, thb = 0, rmb = null;
    const it = expense.inputType;

    if (it === 'usdt') {
      usdt = parseFloat(expense.usdt);
      thb = usdt * exchangeRateUsdtThb;
      rmb = usdt * exchangeRateUsdtRmb;
    } else if (it === 'rmb') {
      rmb = parseFloat(expense.rmb);
      thb = rmb * exchangeRateRmbThb;
      usdt = rmb / (exchangeRateUsdtRmb || 1);
    } else {
      thb = parseFloat(expense.thb);
      usdt = thb / exchangeRateUsdtThb;
      rmb = thb / exchangeRateRmbThb;
    }

    db.prepare(`
      INSERT INTO expenses (date, name, location, usdt, thb, rmb, exchange_rate_usdt_thb, exchange_rate_rmb_thb, input_type, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(expense.date, expense.name, expense.location, usdt, thb, rmb, exchangeRateUsdtThb, exchangeRateRmbThb, it, new Date().toISOString());

    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

// 获取所有记录 (带自动反算修正)
ipcMain.handle('get-expenses', async (event, dateRange) => {
  try {
    let sql = 'SELECT * FROM expenses';
    let params = [];
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      sql += ' WHERE date BETWEEN ? AND ?';
      params = [dateRange.startDate, dateRange.endDate];
    }
    sql += ' ORDER BY date DESC, id DESC';
    const rows = db.prepare(sql).all(...params);

    return rows.map(row => {
      const rUsdtThb = row.exchange_rate_usdt_thb || exchangeRateUsdtThb;
      const rRmbThb = row.exchange_rate_rmb_thb || exchangeRateRmbThb;
      // 如果字段是空，根据泰铢反推
      if (!row.usdt) row.usdt = row.thb / rUsdtThb;
      if (!row.rmb) row.rmb = row.thb / rRmbThb;
      return row;
    });
  } catch (e) { return []; }
});

// 统计逻辑 (彻底修正统计为 0 的问题)
ipcMain.handle('calculate-statistics', async (event, dateRange) => {
  try {
    let sql = 'SELECT * FROM expenses';
    let params = [];
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      sql += ' WHERE date BETWEEN ? AND ?';
      params = [dateRange.startDate, dateRange.endDate];
    }
    const rows = db.prepare(sql).all(...params);

    const stats = { byDate: {}, byLocation: {}, byDateAndLocation: {}, totalUsdt: 0, totalThb: 0, totalRmb: 0, totalCount: rows.length };

    rows.forEach(item => {
      const rUsdtThb = item.exchange_rate_usdt_thb || exchangeRateUsdtThb;
      const rRmbThb = item.exchange_rate_rmb_thb || exchangeRateRmbThb;

      // 无论存的是啥，统一转换计算
      let vUsdt = item.usdt || (item.thb / rUsdtThb);
      let vThb = item.thb;
      let vRmb = item.rmb || (item.thb / rRmbThb);

      stats.totalUsdt += vUsdt;
      stats.totalThb += vThb;
      stats.totalRmb += vRmb;

      const update = (obj, key) => {
        if (!obj[key]) obj[key] = { totalUsdt: 0, totalThb: 0, totalRmb: 0, count: 0 };
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

// 删除记录
ipcMain.handle('delete-expense', async (event, id) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return { success: true };
});

// 排行榜
ipcMain.handle('get-rank-data', async (event, { type, limit = 10 }) => {
  try {
    let sql = "";
    if (type === 'name') sql = `SELECT name as label, SUM(thb) as total_thb FROM expenses GROUP BY name ORDER BY total_thb DESC LIMIT ${limit}`;
    else if (type === 'location') sql = `SELECT location as label, SUM(thb) as total_thb FROM expenses GROUP BY location ORDER BY total_thb DESC LIMIT ${limit}`;
    else sql = `SELECT (name || '-' || location) as label, thb as total_thb FROM expenses ORDER BY thb DESC LIMIT ${limit}`;

    // 返回给 Echarts，金额统一转换成 USDT 展示比较直观
    const data = db.prepare(sql).all();
    return data.map(d => ({ label: d.label, value: d.total_thb / exchangeRateUsdtThb }));
  } catch (e) { return []; }
});

// 联想建议
ipcMain.handle('get-suggestions', async () => {
  const names = db.prepare('SELECT DISTINCT name FROM expenses').all().map(r => r.name);
  const locs = db.prepare('SELECT DISTINCT location FROM expenses').all().map(r => r.location);
  return { names, locations: locs };
});

// 设置 USDT-RMB 汇率
ipcMain.handle('set-usdt-rmb-rate', async (event, rate) => {
  exchangeRateUsdtRmb = parseFloat(rate);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('exchange_rate_usdt_rmb', rate.toString());
  return { success: true };
});

// 默认日期
ipcMain.handle('get-default-date-range', async () => {
  const today = new Date();
  const day = today.getDate();
  let start = new Date(today.getFullYear(), today.getMonth() - (day > 26 ? 0 : 1), 27);
  let end = new Date(today.getFullYear(), today.getMonth() + (day > 26 ? 1 : 0), 26);
  const fmt = d => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
});

// 生命周期
app.whenReady().then(() => {
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') app.quit();
});
