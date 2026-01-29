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

// 获取新增的筛选输入框（姓名和位置）
const filterNameInput = document.getElementById('filterName');
const filterLocationInput = document.getElementById('filterLocation');

let currentExchangeRateUsdtThb = 35.5;
let currentExchangeRateRmbThb = 4.9;
let currentDateRange = null;

// 设置默认日期为今天
if (dateInput) dateInput.valueAsDate = new Date();

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
    currentDateRange = {
      startDate: defaultRange.startDate,
      endDate: defaultRange.endDate,
      name: null,
      location: null
    };

    await loadAndDisplayData();
    // 激活输入建议
    await updateInputSuggestions();
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

  if (inputType === 'usdt') {
    const usdt = parseFloat(usdtAmountInput.value);
    if (isNaN(usdt) || usdt <= 0) { showNotification('请输入有效的 USDT 金额', 'error'); return; }
    expense.usdt = usdt;
  } else if (inputType === 'rmb') {
    const rmb = parseFloat(rmbAmountInput.value);
    if (isNaN(rmb) || rmb <= 0) { showNotification('请输入有效的人民币金额', 'error'); return; }
    expense.rmb = rmb;
  } else {
    const thb = parseFloat(thbAmountInput.value);
    if (isNaN(thb) || thb <= 0) { showNotification('请输入有效的泰铢金额', 'error'); return; }
    expense.thb = thb;
  }

  try {
    const result = await window.expenseAPI.addExpense(expense);
    if (result.success) {
      nameInput.value = '';
      locationInput.value = '';
      usdtAmountInput.value = '';
      rmbAmountInput.value = '';
      thbAmountInput.value = '';
      dateInput.valueAsDate = new Date();
      conversionText.textContent = '请输入金额';
      await loadAndDisplayData();
      await updateInputSuggestions(); // 刷新建议列表
      showNotification('添加成功！', 'success');
    }
  } catch (error) {
    showNotification('操作失败：' + error.message, 'error');
  }
});

// 刷新按钮
refreshBtn.addEventListener('click', () => loadAndDisplayData());

// 筛选按钮修复：增加姓名和位置筛选
filterBtn.addEventListener('click', () => {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const name = filterNameInput ? filterNameInput.value.trim() : "";
  const location = filterLocationInput ? filterLocationInput.value.trim() : "";

  if (!startDate || !endDate) {
    showNotification('请选择开始和结束日期', 'error');
    return;
  }

  currentDateRange = {
    startDate,
    endDate,
    name: name || null,
    location: location || null
  };

  loadAndDisplayData();
  showNotification('筛选已应用', 'info');
});

// 清除筛选按钮
clearFilterBtn.addEventListener('click', () => {
  startDateInput.value = '';
  endDateInput.value = '';
  if (filterNameInput) filterNameInput.value = '';
  if (filterLocationInput) filterLocationInput.value = '';
  currentDateRange = null;
  loadAndDisplayData();
  showNotification('已清除所有筛选', 'info');
});

// 加载并显示所有数据
async function loadAndDisplayData() {
  try {
    const expenses = await window.expenseAPI.getExpenses(currentDateRange);
    const stats = await window.expenseAPI.calculateStatistics(currentDateRange);
    displayRecords(expenses || []);
    displayStatistics(stats || {});

    // 如果排行榜 Tab 是激活状态，自动刷新图表
    const activeTab = localStorage.getItem('activeTab');
    if (activeTab === 'rank') {
      // 默认刷一个排行
      renderRankChart('name');
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    showNotification('加载数据失败', 'error');
  }
}

// 渲染排行图表修复：增加 resize 和自动空处理
async function renderRankChart(type, limit = 10) {
  const data = await window.expenseAPI.getRankData({ type, limit });
  const chartDom = document.getElementById('rankChartContainer');
  if (!chartDom) return;

  if (!data || data.length === 0) {
    chartDom.innerHTML = '<div style="text-align:center; padding-top:100px; color:#999;">该筛选范围内暂无排行数据</div>';
    return;
  }

  const myChart = echarts.getInstanceByDom(chartDom) || echarts.init(chartDom);
  const titleMap = { 'name': '报销总额排行 (USDT)', 'location': '位置消费排行 (USDT)', 'amount': '单笔金额排行 (USDT)' };

  const option = {
    title: { text: titleMap[type] || '费用排行', left: 'center' },
    tooltip: { trigger: 'axis' },
    grid: { left: '15%', right: '10%', bottom: '10%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: data.map(d => d.label).reverse(),
      axisLabel: { interval: 0 }
    },
    series: [{
      name: 'USDT',
      type: 'bar',
      data: data.map(d => d.value).reverse(),
      itemStyle: { color: '#409EFF' },
      label: { show: true, position: 'right' }
    }]
  };
  myChart.setOption(option, true);
  // 关键：防止容器尺寸未计算导致的显示异常
  setTimeout(() => myChart.resize(), 100);
}

// 显示记录列表、统计数据等其余函数 (保持你原有的 displayRecords, displayStatistics 等逻辑)
function displayRecords(expenses) {
  if (!expenses || expenses.length === 0) {
    recordsBody.innerHTML = '<tr><td colspan="7" class="empty-message">暂无记录</td></tr>';
    return;
  }
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  const rows = sortedExpenses.map((expense) => {
    const usdt = (expense.usdt || 0).toFixed(2);
    const rmb = (expense.rmb || 0).toFixed(2);
    const thb = (expense.thb || 0).toFixed(2);
    return `
      <tr>
        <td>${expense.date}</td>
        <td>${expense.name}</td>
        <td>${usdt === '0.00' ? '-' : usdt}</td>
        <td>${rmb === '0.00' ? '-' : '¥' + rmb}</td>
        <td>฿${thb}</td>
        <td>${expense.location}</td>
        <td><button class="btn-delete" onclick="deleteRecord(${expense.id})">删除</button></td>
      </tr>`;
  });
  recordsBody.innerHTML = rows.join('');
}

// 为删除按钮提供全局访问（如果是内联 onclick）
window.deleteRecord = async function (id) {
  if (!confirm('确定要删除吗？')) return;
  const result = await window.expenseAPI.deleteExpense(id);
  if (result.success) { loadAndDisplayData(); showNotification('已删除', 'success'); }
};

function displayStatistics(stats) {
  totalCountEl.textContent = stats.totalCount || 0;
  totalUsdtEl.textContent = (stats.totalUsdt || 0).toFixed(2);
  totalRmbEl.textContent = '¥' + (stats.totalRmb || 0).toFixed(2);
  totalThbEl.textContent = '฿' + (stats.totalThb || 0).toFixed(2);
  displayDateStats(stats.byDate);
  displayLocationStats(stats.byLocation);
  displayDateLocationStats(stats.byDateAndLocation);
}

function displayDateStats(byDate) {
  if (!byDate || Object.keys(byDate).length === 0) { dateStatsEl.innerHTML = '暂无数据'; return; }
  const sortedDates = Object.keys(byDate).sort().reverse();
  dateStatsEl.innerHTML = sortedDates.map(date => {
    const data = byDate[date];
    return `<div class="stat-item"><b>${date}</b> | 记录: ${data.count} | USDT: ${data.totalUsdt.toFixed(2)}</div>`;
  }).join('');
}

function displayLocationStats(byLocation) {
  if (!byLocation || Object.keys(byLocation).length === 0) { locationStatsEl.innerHTML = '暂无数据'; return; }
  const sorted = Object.entries(byLocation).sort((a, b) => b[1].totalThb - a[1].totalThb);
  locationStatsEl.innerHTML = sorted.map(([loc, data]) => `
    <div class="stat-item"><b>${loc}</b> | 记录: ${data.count} | USDT: ${data.totalUsdt.toFixed(2)}</div>
  `).join('');
}

function displayDateLocationStats(byDateAndLocation) {
  if (!byDateAndLocation || Object.keys(byDateAndLocation).length === 0) { dateLocationStatsEl.innerHTML = '暂无数据'; return; }
  const sorted = Object.values(byDateAndLocation).sort((a, b) => b.date.localeCompare(a.date));
  dateLocationStatsEl.innerHTML = sorted.map(data => `
    <div class="stat-item"><b>${data.date} - ${data.location}</b> | USDT: ${data.totalUsdt.toFixed(2)}</div>
  `).join('');
}

function showNotification(message, type = 'info') {
  const n = document.createElement('div');
  n.className = `notification ${type}`;
  n.style.cssText = `position:fixed;top:20px;right:20px;padding:10px 20px;background:#333;color:#fff;border-radius:5px;z-index:9999;`;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

// Tab 切换逻辑
function initializeTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
      localStorage.setItem('activeTab', target);
      // 如果切到排行 Tab，默认加载姓名排行
      if (target === 'rank') renderRankChart('name');
    });
  });
  const saved = localStorage.getItem('activeTab') || 'allRecords';
  const savedBtn = document.querySelector(`[data-tab="${saved}"]`);
  if (savedBtn) savedBtn.click();
}

async function updateInputSuggestions() {
  try {
    const { names, locations } = await window.expenseAPI.getSuggestions();
    const nameList = document.getElementById('nameList');
    const locList = document.getElementById('locationList');
    if (nameList) nameList.innerHTML = names.map(n => `<option value="${n}">`).join('');
    if (locList) locList.innerHTML = locations.map(l => `<option value="${l}">`).join('');
  } catch (e) { console.error("建议获取失败", e); }
}

// 页面加载启动
window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  initializeTabs();
});

// 全局挂载 renderRankChart 以便 HTML 中的按钮调用
window.renderRankChart = renderRankChart;
