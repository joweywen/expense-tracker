const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('expenseAPI', {
  // 在 contextBridge 的那个大括号里找到末尾，加上这两行：
  getRankData: (params) => ipcRenderer.invoke('get-rank-data', params),
  getSuggestions: () => ipcRenderer.invoke('get-suggestions'),
  // 获取默认日期区间
  getDefaultDateRange: () => ipcRenderer.invoke('get-default-date-range'),

  // 更新每日汇率
  updateDailyRates: (rates) => ipcRenderer.invoke('update-daily-rates', rates),

  // 监听汇率更新
  onRatesUpdated: (callback) => {
    ipcRenderer.on('rates-updated', (event, rates) => callback(rates));
  },
  // 设置汇率
  setExchangeRate: (rate) => ipcRenderer.invoke('set-exchange-rate', rate),

  // 获取汇率
  getExchangeRate: () => ipcRenderer.invoke('get-exchange-rate'),

  // 添加费用记录
  addExpense: (expense) => ipcRenderer.invoke('add-expense', expense),

  // 获取所有费用记录
  getExpenses: (dateRange) => ipcRenderer.invoke('get-expenses', dateRange),

  // 删除费用记录
  deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),

  // 计算统计数据
  calculateStatistics: (dateRange) => ipcRenderer.invoke('calculate-statistics', dateRange),

  // 监听数据清空事件
  onDataCleared: (callback) => {
    ipcRenderer.on('data-cleared', callback);
  }

});
