// DOM 元素
const form = document.getElementById('expenseForm');
const dateInput = document.getElementById('date');
const nameInput = document.getElementById('name');
const locationInput = document.getElementById('location');
const usdtAmountInput = document.getElementById('usdtAmount');
const rmbAmountInput = document.getElementById('rmbAmount');
const thbAmountInput = document.getElementById('thbAmount');
const exchangeRateUsdtThbInput = document.getElementById('exchangeRateUsdtThb');
const exchangeRateRmbThbInput = document.getElementById('exchangeRateRmbThb');
const setRateBtn = document.getElementById('setRateBtn');
const currentRateUsdtThbDisplay = document.getElementById('currentRateUsdtThb');
const currentRateRmbThbDisplay = document.getElementById('currentRateRmbThb');
const conversionText = document.getElementById('conversionText');
const refreshBtn = document.getElementById('refreshBtn');
const filterBtn = document.getElementById('filterBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const recordsBody = document.getElementById('recordsBody');
const totalCountEl = document.getElementById('totalCount');
const totalUsdtEl = document.getElementById('totalUsdt');
const totalRmbEl = document.getElementById('totalRmb');
const totalThbEl = document.getElementById('totalThb');
const dateStatsEl = document.getElementById('dateStats');
const locationStatsEl = document.getElementById('locationStats');
const dateLocationStatsEl = document.getElementById('dateLocationStats');

let currentExchangeRateUsdtThb = 35.5;
let currentExchangeRateRmbThb = 4.9;
let currentDateRange = null;

// 设置默认日期为今天
dateInput.valueAsDate = new Date();

// 初始化：加载汇率和设置默认日期区间
async function initializeApp() {
  try {
    const rates = await window.expenseAPI.getExchangeRate();
    currentExchangeRateUsdtThb = rates.usdtThb;
    currentExchangeRateRmbThb = rates.rmbThb;
    exchangeRateUsdtThbInput.value = rates.usdtThb;
    exchangeRateRmbThbInput.value = rates.rmbThb;
    currentRateUsdtThbDisplay.textContent = rates.usdtThb.toFixed(2);
    currentRateRmbThbDisplay.textContent = rates.rmbThb.toFixed(2);

    // 设置默认日期区间（账期：27号到26号）
    const defaultRange = await window.expenseAPI.getDefaultDateRange();
    startDateInput.value = defaultRange.startDate;
    endDateInput.value = defaultRange.endDate;
    currentDateRange = defaultRange;

    await loadAndDisplayData();
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

// 监听主窗口的汇率更新事件
window.expenseAPI.onRatesUpdated((rates) => {
  currentExchangeRateUsdtThb = rates.usdtThb;
  currentExchangeRateRmbThb = rates.rmbThb;
  exchangeRateUsdtThbInput.value = rates.usdtThb;
  exchangeRateRmbThbInput.value = rates.rmbThb;
  currentRateUsdtThbDisplay.textContent = rates.usdtThb.toFixed(2);
  currentRateRmbThbDisplay.textContent = rates.rmbThb.toFixed(2);
  showNotification(`汇率已更新：1 USDT = ${rates.usdtThb} THB, 1 RMB = ${rates.rmbThb} THB`, 'success');
});

// 设置汇率
setRateBtn.addEventListener('click', async () => {
  const newUsdtThbRate = parseFloat(exchangeRateUsdtThbInput.value);
  const newRmbThbRate = parseFloat(exchangeRateRmbThbInput.value);

  if (isNaN(newUsdtThbRate) || newUsdtThbRate <= 0 || isNaN(newRmbThbRate) || newRmbThbRate <= 0) {
    showNotification('请输入有效的汇率', 'error');
    return;
  }

  try {
    const result = await window.expenseAPI.setExchangeRate({
      usdtThb: newUsdtThbRate,
      rmbThb: newRmbThbRate
    });

    if (result.success) {
      currentExchangeRateUsdtThb = result.usdtThb;
      currentExchangeRateRmbThb = result.rmbThb;
      currentRateUsdtThbDisplay.textContent = result.usdtThb.toFixed(2);
      currentRateRmbThbDisplay.textContent = result.rmbThb.toFixed(2);
      showNotification('汇率设置成功！', 'success');
      updateConversionDisplay();
    }
  } catch (error) {
    showNotification('设置汇率失败：' + error.message, 'error');
  }
});

// 币种输入切换
document.querySelectorAll('input[name="inputType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    usdtAmountInput.disabled = true;
    rmbAmountInput.disabled = true;
    thbAmountInput.disabled = true;
    usdtAmountInput.value = '';
    rmbAmountInput.value = '';
    thbAmountInput.value = '';

    if (e.target.value === 'usdt') {
      usdtAmountInput.disabled = false;
      usdtAmountInput.focus();
    } else if (e.target.value === 'rmb') {
      rmbAmountInput.disabled = false;
      rmbAmountInput.focus();
    } else {
      thbAmountInput.disabled = false;
      thbAmountInput.focus();
    }
    updateConversionDisplay();
  });
});

// 监听输入变化
usdtAmountInput.addEventListener('input', updateConversionDisplay);
rmbAmountInput.addEventListener('input', updateConversionDisplay);
thbAmountInput.addEventListener('input', updateConversionDisplay);

// 更新转换显示
function updateConversionDisplay() {
  const inputType = document.querySelector('input[name="inputType"]:checked').value;

  if (inputType === 'usdt') {
    const usdt = parseFloat(usdtAmountInput.value);
    if (!isNaN(usdt) && usdt > 0) {
      const thb = usdt * currentExchangeRateUsdtThb;
      conversionText.innerHTML = `${usdt.toFixed(2)} USDT = <strong>${thb.toFixed(2)} THB</strong>`;
    } else {
      conversionText.textContent = '请输入 USDT 金额';
    }
  } else if (inputType === 'rmb') {
    const rmb = parseFloat(rmbAmountInput.value);
    if (!isNaN(rmb) && rmb > 0) {
      const thb = rmb * currentExchangeRateRmbThb;
      conversionText.innerHTML = `${rmb.toFixed(2)} RMB = <strong>${thb.toFixed(2)} THB</strong>`;
    } else {
      conversionText.textContent = '请输入人民币金额';
    }
  } else {
    const thb = parseFloat(thbAmountInput.value);
    if (!isNaN(thb) && thb > 0) {
      conversionText.innerHTML = `泰铢金额: <strong>${thb.toFixed(2)} THB</strong>`;
    } else {
      conversionText.textContent = '请输入泰铢金额';
    }
  }
}

// 表单提交
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const inputType = document.querySelector('input[name="inputType"]:checked').value;

  const expense = {
    date: dateInput.value,
    name: nameInput.value.trim(),
    location: locationInput.value.trim(),
    inputType: inputType
  };

  // 根据选择的输入类型添加金额
  if (inputType === 'usdt') {
    const usdt = parseFloat(usdtAmountInput.value);
    if (isNaN(usdt) || usdt <= 0) {
      showNotification('请输入有效的 USDT 金额', 'error');
      return;
    }
    expense.usdt = usdt;
  } else if (inputType === 'rmb') {
    const rmb = parseFloat(rmbAmountInput.value);
    if (isNaN(rmb) || rmb <= 0) {
      showNotification('请输入有效的人民币金额', 'error');
      return;
    }
    expense.rmb = rmb;
  } else {
    const thb = parseFloat(thbAmountInput.value);
    if (isNaN(thb) || thb <= 0) {
      showNotification('请输入有效的泰铢金额', 'error');
      return;
    }
    expense.thb = thb;
  }

  try {
    const result = await window.expenseAPI.addExpense(expense);

    if (result.success) {
      // 清空表单
      nameInput.value = '';
      locationInput.value = '';
      usdtAmountInput.value = '';
      rmbAmountInput.value = '';
      thbAmountInput.value = '';
      dateInput.valueAsDate = new Date();
      conversionText.textContent = '请输入金额';

      // 刷新显示
      await loadAndDisplayData();

      // 显示成功提示
      showNotification('添加成功！', 'success');
    } else {
      showNotification('添加失败：' + result.error, 'error');
    }
  } catch (error) {
    showNotification('操作失败：' + error.message, 'error');
  }
});

// 刷新按钮
refreshBtn.addEventListener('click', () => loadAndDisplayData());

// 筛选按钮
filterBtn.addEventListener('click', () => {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (!startDate || !endDate) {
    showNotification('请选择开始和结束日期', 'error');
    return;
  }

  if (startDate > endDate) {
    showNotification('开始日期不能晚于结束日期', 'error');
    return;
  }

  currentDateRange = { startDate, endDate };
  loadAndDisplayData();
  showNotification(`已筛选 ${startDate} 至 ${endDate} 的数据`, 'info');
});

// 清除筛选按钮
clearFilterBtn.addEventListener('click', () => {
  startDateInput.value = '';
  endDateInput.value = '';
  currentDateRange = null;
  loadAndDisplayData();
  showNotification('已清除日期筛选', 'info');
});

// 删除记录
async function deleteRecord(id) {
  if (!confirm('确定要删除这条记录吗？')) {
    return;
  }

  try {
    const result = await window.expenseAPI.deleteExpense(id);
    if (result.success) {
      await loadAndDisplayData();
      showNotification('删除成功！', 'success');
    } else {
      showNotification('删除失败：' + result.error, 'error');
    }
  } catch (error) {
    showNotification('操作失败：' + error.message, 'error');
  }
}

// 加载并显示所有数据
async function loadAndDisplayData() {
  try {
    // 获取所有记录
    const expenses = await window.expenseAPI.getExpenses(currentDateRange);
    console.log('获取到的记录:', expenses);

    // 获取统计数据
    const stats = await window.expenseAPI.calculateStatistics(currentDateRange);
    console.log('统计数据:', stats);

    // 显示记录列表
    displayRecords(expenses || []);

    // 显示统计数据
    displayStatistics(stats || {});
  } catch (error) {
    console.error('加载数据失败:', error);
    showNotification('加载数据失败: ' + error.message, 'error');

    // 显示空数据，避免界面卡住
    displayRecords([]);
    displayStatistics({
      byDate: {},
      byLocation: {},
      byDateAndLocation: {},
      totalUsdt: 0,
      totalRmb: 0,
      totalThb: 0,
      totalCount: 0
    });
  }
}

// 显示记录列表
function displayRecords(expenses) {
  if (!expenses || expenses.length === 0) {
    recordsBody.innerHTML = '<tr><td colspan="7" class="empty-message">暂无记录</td></tr>';
    return;
  }

  const sortedExpenses = [...expenses].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  try {
    const rows = sortedExpenses.map((expense) => {
      const date = expense.date || '-';
      const name = expense.name || '-';
      const location = expense.location || '-';

      const usdt = (expense.usdt || 0).toFixed(2);
      const rmb = (expense.rmb || 0).toFixed(2);
      const thb = (expense.thb || 0).toFixed(2);

      // 根据输入类型显示不同的标记
      let usdtDisplay = usdt === '0.00' ? '-' : usdt;
      let rmbDisplay = rmb === '0.00' ? '-' : `¥${rmb}`;

      return `
        <tr>
          <td>${date}</td>
          <td>${name}</td>
          <td>${usdtDisplay}</td>
          <td>${rmbDisplay}</td>
          <td>฿${thb}</td>
          <td>${location}</td>
          <td>
            <button class="btn-delete" data-id="${expense.id}">删除</button>
          </td>
        </tr>
      `;
    });

    recordsBody.innerHTML = rows.join('');
    // 使用事件委托为删除按钮添加事件
    recordsBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = parseInt(this.getAttribute('data-id'));
        deleteRecord(id);
      });
    });
  } catch (error) {
    console.error('displayRecords 发生错误:', error);
    recordsBody.innerHTML = `<tr><td colspan="7" class="empty-message" style="color: red;">显示记录时出错: ${error.message}</td></tr>`;
  }
}

// 显示统计数据
function displayStatistics(stats) {
  const safeStats = {
    totalCount: stats?.totalCount || 0,
    totalUsdt: stats?.totalUsdt || 0,
    totalRmb: stats?.totalRmb || 0,
    totalThb: stats?.totalThb || 0,
    byDate: stats?.byDate || {},
    byLocation: stats?.byLocation || {},
    byDateAndLocation: stats?.byDateAndLocation || {}
  };

  totalCountEl.textContent = safeStats.totalCount;
  totalUsdtEl.textContent = safeStats.totalUsdt.toFixed(2);
  totalRmbEl.textContent = '¥' + safeStats.totalRmb.toFixed(2);
  totalThbEl.textContent = '฿' + safeStats.totalThb.toFixed(2);

  displayDateStats(safeStats.byDate);
  displayLocationStats(safeStats.byLocation);
  displayDateLocationStats(safeStats.byDateAndLocation);
}

// 显示按日期统计
function displayDateStats(byDate) {
  if (!byDate || Object.keys(byDate).length === 0) {
    dateStatsEl.innerHTML = '<div class="stat-item"><div class="stat-item-info">暂无数据</div></div>';
    return;
  }

  const sortedDates = Object.keys(byDate).sort().reverse();

  dateStatsEl.innerHTML = sortedDates.map(date => {
    const data = byDate[date];
    return `
      <div class="stat-item">
        <div class="stat-item-info">
          <div class="stat-item-title">${date}</div>
          <div class="stat-item-detail">记录数: ${data.count || 0} 条</div>
          <div class="stat-item-amounts">
            <span class="amount-usdt">USDT: ${(data.totalUsdt || 0).toFixed(2)}</span>
            <span class="amount-rmb">RMB: ¥${(data.totalRmb || 0).toFixed(2)}</span>
            <span class="amount-thb">THB: ฿${(data.totalThb || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 显示按位置统计
function displayLocationStats(byLocation) {
  if (!byLocation || Object.keys(byLocation).length === 0) {
    locationStatsEl.innerHTML = '<div class="stat-item"><div class="stat-item-info">暂无数据</div></div>';
    return;
  }

  const sortedLocations = Object.entries(byLocation)
    .sort((a, b) => (b[1].totalThb || 0) - (a[1].totalThb || 0));

  locationStatsEl.innerHTML = sortedLocations.map(([location, data]) => `
    <div class="stat-item">
      <div class="stat-item-info">
        <div class="stat-item-title">${location}</div>
        <div class="stat-item-detail">记录数: ${data.count || 0} 条</div>
        <div class="stat-item-amounts">
          <span class="amount-usdt">USDT: ${(data.totalUsdt || 0).toFixed(2)}</span>
          <span class="amount-rmb">RMB: ¥${(data.totalRmb || 0).toFixed(2)}</span>
          <span class="amount-thb">THB: ฿${(data.totalThb || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// 显示按日期和位置统计
function displayDateLocationStats(byDateAndLocation) {
  if (!byDateAndLocation || Object.keys(byDateAndLocation).length === 0) {
    dateLocationStatsEl.innerHTML = '<div class="stat-item"><div class="stat-item-info">暂无数据</div></div>';
    return;
  }

  const sortedData = Object.values(byDateAndLocation)
    .sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return a.location.localeCompare(b.location);
    });

  dateLocationStatsEl.innerHTML = sortedData.map(data => {
    const recordDetails = (data.records || [])
      .map(r => {
        const parts = [];
        if (r.usdt) parts.push(`${r.usdt.toFixed(2)} USDT`);
        if (r.rmb) parts.push(`¥${r.rmb.toFixed(2)}`);
        parts.push(`฿${(r.thb || 0).toFixed(2)}`);
        return `${r.name || '-'}: ${parts.join(' / ')}`;
      })
      .join(', ');

    return `
      <div class="stat-item">
        <div class="stat-item-info">
          <div class="stat-item-title">${data.date} - ${data.location}</div>
          <div class="stat-item-detail">记录数: ${data.count || 0} 条</div>
          <div class="stat-item-amounts">
            <span class="amount-usdt">USDT: ${(data.totalUsdt || 0).toFixed(2)}</span>
            <span class="amount-rmb">RMB: ¥${(data.totalRmb || 0).toFixed(2)}</span>
            <span class="amount-thb">THB: ฿${(data.totalThb || 0).toFixed(2)}</span>
          </div>
          <div class="stat-item-records">${recordDetails || '暂无明细'}</div>
        </div>
      </div>
    `;
  }).join('');
}

// 通知提示
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 1000;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  .amount-rmb { font-size: 16px; font-weight: 700; color: #f5576c; }
`;
document.head.appendChild(style);

// 监听数据清空事件
window.expenseAPI.onDataCleared(() => {
  loadAndDisplayData();
  showNotification('所有数据已清空', 'info');
});

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', initializeApp);
// ==================== Tab 切换功能 ====================
function initializeTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // 移除所有active状态
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      // 添加active到当前选中的
      btn.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');

      // 可选：存储当前选中的Tab
      localStorage.setItem('activeTab', targetTab);
    });
  });

  // 恢复上次选中的Tab
  const savedTab = localStorage.getItem('activeTab');
  if (savedTab) {
    const savedBtn = document.querySelector(`[data-tab="${savedTab}"]`);
    if (savedBtn) {
      savedBtn.click();
    }
  }
}

// 在页面加载完成后初始化Tab
window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  initializeTabs();
});
