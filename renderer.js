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
const exchangeRateUsdtRmbInput = document.getElementById('exchangeRateUsdtRmb');

const setRateBtn = document.getElementById('setRateBtn');
const currentRateUsdtThbDisplay = document.getElementById('currentRateUsdtThb');
const currentRateRmbThbDisplay = document.getElementById('currentRateRmbThb');
const currentRateUsdtRmbDisplay = document.getElementById('currentRateUsdtRmb');

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

const filterNameInput = document.getElementById('filterName');
const filterLocationInput = document.getElementById('filterLocation');

let currentExchangeRateUsdtThb = 35.5;
let currentExchangeRateRmbThb = 4.9;
let currentExchangeRateUsdtRmb = 7.24;
let currentDateRange = null;

if (dateInput) dateInput.valueAsDate = new Date();

async function initializeApp() {
  try {
    const rates = await window.expenseAPI.getExchangeRate();
    currentExchangeRateUsdtThb = rates.usdtThb;
    currentExchangeRateRmbThb = rates.rmbThb;
    currentExchangeRateUsdtRmb = rates.usdtRmb || 7.24;

    exchangeRateUsdtThbInput.value = rates.usdtThb;
    exchangeRateRmbThbInput.value = rates.rmbThb;
    if (exchangeRateUsdtRmbInput) exchangeRateUsdtRmbInput.value = currentExchangeRateUsdtRmb;

    currentRateUsdtThbDisplay.textContent = rates.usdtThb.toFixed(2);
    currentRateRmbThbDisplay.textContent = rates.rmbThb.toFixed(2);
    if (currentRateUsdtRmbDisplay) currentRateUsdtRmbDisplay.textContent = currentExchangeRateUsdtRmb.toFixed(2);

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
    await updateInputSuggestions(); // 初始加载联想词
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

window.expenseAPI.onRatesUpdated((rates) => {
  currentExchangeRateUsdtThb = rates.usdtThb;
  currentExchangeRateRmbThb = rates.rmbThb;
  exchangeRateUsdtThbInput.value = rates.usdtThb;
  exchangeRateRmbThbInput.value = rates.rmbThb;
  currentRateUsdtThbDisplay.textContent = rates.usdtThb.toFixed(2);
  currentRateRmbThbDisplay.textContent = rates.rmbThb.toFixed(2);
  showNotification(`汇率已更新`, 'success');
});

setRateBtn.addEventListener('click', async () => {
  const newUsdtThbRate = parseFloat(exchangeRateUsdtThbInput.value);
  const newRmbThbRate = parseFloat(exchangeRateRmbThbInput.value);
  const newUsdtRmbRate = exchangeRateUsdtRmbInput ? parseFloat(exchangeRateUsdtRmbInput.value) : currentExchangeRateUsdtRmb;

  if (isNaN(newUsdtThbRate) || newUsdtThbRate <= 0 || isNaN(newRmbThbRate) || newRmbThbRate <= 0 || isNaN(newUsdtRmbRate) || newUsdtRmbRate <= 0) {
    showNotification('请输入有效的汇率', 'error');
    return;
  }

  try {
    const result = await window.expenseAPI.setExchangeRate({
      usdtThb: newUsdtThbRate,
      rmbThb: newRmbThbRate
    });
    await window.expenseAPI.setUsdtRmbRate(newUsdtRmbRate);

    if (result.success) {
      currentExchangeRateUsdtThb = newUsdtThbRate;
      currentExchangeRateRmbThb = newRmbThbRate;
      currentExchangeRateUsdtRmb = newUsdtRmbRate;

      currentRateUsdtThbDisplay.textContent = currentExchangeRateUsdtThb.toFixed(2);
      currentRateRmbThbDisplay.textContent = currentExchangeRateRmbThb.toFixed(2);
      if (currentRateUsdtRmbDisplay) currentRateUsdtRmbDisplay.textContent = newUsdtRmbRate.toFixed(2);

      showNotification('汇率设置成功！', 'success');
      updateConversionDisplay();
    }
  } catch (error) {
    showNotification('设置汇率失败：' + error.message, 'error');
  }
});

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

usdtAmountInput.addEventListener('input', updateConversionDisplay);
rmbAmountInput.addEventListener('input', updateConversionDisplay);
thbAmountInput.addEventListener('input', updateConversionDisplay);

function updateConversionDisplay() {
  const inputType = document.querySelector('input[name="inputType"]:checked').value;
  if (inputType === 'usdt') {
    const usdt = parseFloat(usdtAmountInput.value);
    if (!isNaN(usdt) && usdt > 0) {
      const thb = usdt * currentExchangeRateUsdtThb;
      const rmb = usdt * currentExchangeRateUsdtRmb;
      conversionText.innerHTML = `${usdt.toFixed(2)} USDT ≈ <strong>${rmb.toFixed(2)} RMB</strong> | <strong>${thb.toFixed(2)} THB</strong>`;
    } else { conversionText.textContent = '请输入 USDT 金额'; }
  } else if (inputType === 'rmb') {
    const rmb = parseFloat(rmbAmountInput.value);
    if (!isNaN(rmb) && rmb > 0) {
      const thb = rmb * currentExchangeRateRmbThb;
      const usdt = rmb / currentExchangeRateUsdtRmb;
      conversionText.innerHTML = `${rmb.toFixed(2)} RMB ≈ <strong>${usdt.toFixed(2)} USDT</strong> | <strong>${thb.toFixed(2)} THB</strong>`;
    } else { conversionText.textContent = '请输入人民币金额'; }
  } else {
    const thb = parseFloat(thbAmountInput.value);
    if (!isNaN(thb) && thb > 0) {
      const usdt = thb / currentExchangeRateUsdtThb;
      const rmb = thb / currentExchangeRateRmbThb;
      conversionText.innerHTML = `${thb.toFixed(2)} THB ≈ <strong>${usdt.toFixed(2)} USDT</strong> | <strong>${rmb.toFixed(2)} RMB</strong>`;
    } else { conversionText.textContent = '请输入泰铢金额'; }
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const inputType = document.querySelector('input[name="inputType"]:checked').value;
  const expense = {
    date: dateInput.value,
    name: nameInput.value.trim(),
    location: locationInput.value.trim(),
    inputType: inputType
  };

  if (inputType === 'usdt') expense.usdt = parseFloat(usdtAmountInput.value);
  else if (inputType === 'rmb') expense.rmb = parseFloat(rmbAmountInput.value);
  else expense.thb = parseFloat(thbAmountInput.value);

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
      await updateInputSuggestions(); // 成功后刷新联想词
      showNotification('添加成功！', 'success');
    }
  } catch (error) {
    showNotification('操作失败：' + error.message, 'error');
  }
});

refreshBtn.addEventListener('click', () => loadAndDisplayData());

filterBtn.addEventListener('click', () => {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const name = filterNameInput ? filterNameInput.value.trim() : "";
  const location = filterLocationInput ? filterLocationInput.value.trim() : "";
  if (!startDate || !endDate) { showNotification('请选择开始和结束日期', 'error'); return; }
  currentDateRange = { startDate, endDate, name: name || null, location: location || null };
  loadAndDisplayData();
});

clearFilterBtn.addEventListener('click', () => {
  startDateInput.value = '';
  endDateInput.value = '';
  if (filterNameInput) filterNameInput.value = '';
  if (filterLocationInput) filterLocationInput.value = '';
  currentDateRange = null;
  loadAndDisplayData();
});

async function loadAndDisplayData() {
  try {
    const expenses = await window.expenseAPI.getExpenses(currentDateRange);
    const stats = await window.expenseAPI.calculateStatistics(currentDateRange);
    displayRecords(expenses || []);
    displayStatistics(stats || {});
    const activeTab = localStorage.getItem('activeTab');
    if (activeTab === 'rank') renderRankChart('name');
  } catch (error) {
    console.error('加载数据失败:', error);
    showNotification('加载数据失败', 'error');
  }
}

async function renderRankChart(type, limit = 10) {
  const data = await window.expenseAPI.getRankData({ type, limit });
  const chartDom = document.getElementById('rankChartContainer');
  if (!chartDom) return;
  if (!data || data.length === 0) {
    chartDom.innerHTML = '<div style="text-align:center; padding-top:100px; color:#999;">暂无排行数据</div>';
    return;
  }
  const myChart = echarts.getInstanceByDom(chartDom) || echarts.init(chartDom);
  const titleMap = { 'name': '报销总额排行', 'location': '位置消费排行', 'amount': '单笔金额排行' };
  const option = {
    title: { text: titleMap[type], left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: data.map(d => d.label).reverse() },
    series: [{ name: 'USDT', type: 'bar', data: data.map(d => d.value).reverse(), itemStyle: { color: '#409EFF' } }]
  };
  myChart.setOption(option, true);
  myChart.resize();
}

function displayRecords(expenses) {
  if (!expenses || expenses.length === 0) {
    recordsBody.innerHTML = '<tr><td colspan="7">暂无记录</td></tr>';
    return;
  }
  const rows = expenses.map((expense) => `
    <tr>
      <td>${expense.date}</td>
      <td>${expense.name}</td>
      <td>${(expense.usdt || 0).toFixed(2)}</td>
      <td>¥${(expense.rmb || 0).toFixed(2)}</td>
      <td>฿${(expense.thb || 0).toFixed(2)}</td>
      <td>${expense.location}</td>
      <td><button class="btn-delete" onclick="deleteRecord(${expense.id})">删除</button></td>
    </tr>`).join('');
  recordsBody.innerHTML = rows;
}

window.deleteRecord = async function (id) {
  if (!confirm('确定要删除吗？')) return;
  const result = await window.expenseAPI.deleteExpense(id);
  if (result.success) { loadAndDisplayData(); showNotification('已删除', 'success'); updateInputSuggestions(); }
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
  if (!byDate) { dateStatsEl.innerHTML = '暂无数据'; return; }
  const sortedDates = Object.keys(byDate).sort().reverse();
  dateStatsEl.innerHTML = sortedDates.map(date => {
    const data = byDate[date];
    return `<div class="stat-item"><b>${date}</b> | USDT: ${data.totalUsdt.toFixed(2)}</div>`;
  }).join('');
}

function displayLocationStats(byLocation) {
  if (!byLocation) { locationStatsEl.innerHTML = '暂无数据'; return; }
  const sorted = Object.entries(byLocation).sort((a, b) => b[1].totalThb - a[1].totalThb);
  locationStatsEl.innerHTML = sorted.map(([loc, data]) => `
    <div class="stat-item"><b>${loc}</b> | USDT: ${data.totalUsdt.toFixed(2)}</div>`).join('');
}

function displayDateLocationStats(byDateAndLocation) {
  if (!byDateAndLocation || Object.keys(byDateAndLocation).length === 0) {
    dateLocationStatsEl.innerHTML = '暂无数据';
    return;
  }
  const sorted = Object.values(byDateAndLocation).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  dateLocationStatsEl.innerHTML = sorted.map(data => `
    <div class="stat-item"><b>${data.date || '未定'} - ${data.location || '未知'}</b> | USDT: ${(data.totalUsdt || 0).toFixed(2)}</div>`).join('');
}

function showNotification(message, type = 'info') {
  const n = document.createElement('div');
  n.className = `notification ${type}`;
  n.style.cssText = `position:fixed;top:20px;right:20px;padding:10px 20px;background:#333;color:#fff;border-radius:5px;z-index:9999;`;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

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
    if (nameList) nameList.innerHTML = (names || []).map(n => `<option value="${n}">`).join('');
    if (locList) locList.innerHTML = (locations || []).map(l => `<option value="${l}">`).join('');
  } catch (e) { console.error("建议获取失败", e); }
}

// 统一 HTML 调用接口
window.updateSuggestions = updateInputSuggestions;

window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  initializeTabs();
});

window.renderRankChart = renderRankChart;
