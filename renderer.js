// --- DOM 元素 (原有的) ---
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
const grossProfitRmbEl = document.getElementById('grossProfitRmb');
const dateStatsEl = document.getElementById('dateStats');
const locationStatsEl = document.getElementById('locationStats');
const dateLocationStatsEl = document.getElementById('dateLocationStats');
const filterNameInput = document.getElementById('filterName');
const filterLocationInput = document.getElementById('filterLocation');

// --- 新增：预约换汇相关 DOM ---
const reserveForm = document.getElementById('reserveForm');
const reserveQueryDateInput = document.getElementById('reserveQueryDate');
const reserveTableBody = document.getElementById('reserveTableBody');
const reserveDateDisplay = document.getElementById('currentReserveDateDisplay');
const resTotalUsdtEl = document.getElementById('resTotalUsdt');
const resTotalRmbEl = document.getElementById('resTotalRmb');
const resTotalThbEl = document.getElementById('resTotalThb');

let currentExchangeRateUsdtThb = 35.5;
let currentExchangeRateRmbThb = 4.9;
let currentExchangeRateUsdtRmb = 7.24;
let currentDateRange = null;
let displayedExpenses = new Map();
let editingExpenseId = null;
const submitExpenseBtn = document.getElementById('submitExpenseBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// 初始化日期
if (dateInput) dateInput.valueAsDate = new Date();
if (reserveQueryDateInput) reserveQueryDateInput.valueAsDate = new Date();
if (document.getElementById('resDate')) document.getElementById('resDate').valueAsDate = new Date();

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
    await updateInputSuggestions();
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

// --- 原有汇率处理逻辑 ---
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
    const result = await window.expenseAPI.setExchangeRate({ usdtThb: newUsdtThbRate, rmbThb: newRmbThbRate });
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
  } catch (error) { showNotification('设置汇率失败：' + error.message, 'error'); }
});

// --- 原有金额输入与转换逻辑 ---
document.querySelectorAll('input[name="inputType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    usdtAmountInput.disabled = true; rmbAmountInput.disabled = true; thbAmountInput.disabled = true;
    usdtAmountInput.value = ''; rmbAmountInput.value = ''; thbAmountInput.value = '';
    if (e.target.value === 'usdt') { usdtAmountInput.disabled = false; usdtAmountInput.focus(); }
    else if (e.target.value === 'rmb') { rmbAmountInput.disabled = false; rmbAmountInput.focus(); }
    else { thbAmountInput.disabled = false; thbAmountInput.focus(); }
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

// --- 原有费用记录提交逻辑 ---
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
    const isEditing = editingExpenseId !== null;
    const result = isEditing
      ? await window.expenseAPI.updateExpense({ ...expense, id: editingExpenseId })
      : await window.expenseAPI.addExpense(expense);
    if (result.success) {
      resetExpenseForm();
      await loadAndDisplayData();
      await updateInputSuggestions();
      showNotification(isEditing ? '费用修改成功！' : '费用添加成功！', 'success');
      nameInput.focus();
    } else {
      showNotification(result.error || '操作失败', 'error');
    }
  } catch (error) { showNotification('操作失败：' + error.message, 'error'); }
});

function setInputType(inputType) {
  const radio = document.querySelector(`input[name="inputType"][value="${inputType}"]`);
  if (radio) radio.checked = true;
  usdtAmountInput.disabled = inputType !== 'usdt';
  rmbAmountInput.disabled = inputType !== 'rmb';
  thbAmountInput.disabled = inputType !== 'thb';
}

function resetExpenseForm() {
  editingExpenseId = null;
  form.reset();
  dateInput.valueAsDate = new Date();
  nameInput.readOnly = false;
  locationInput.readOnly = false;
  setInputType('usdt');
  usdtAmountInput.value = '';
  rmbAmountInput.value = '';
  thbAmountInput.value = '';
  conversionText.textContent = '请输入金额';
  submitExpenseBtn.textContent = '添加记录';
  cancelEditBtn.hidden = true;
}

if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetExpenseForm);

// --- 新增：预约换汇逻辑处理 ---

// 1. 提交预约申请
if (reserveForm) {
  reserveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('resName').value.trim(),
      type: document.getElementById('resType').value.trim(),
      date: document.getElementById('resDate').value,
      delivery: document.getElementById('resDelivery').value,
      location: document.getElementById('resLocation').value.trim(),
      usdt: parseFloat(document.getElementById('resUsdt').value) || 0,
      rmb: parseFloat(document.getElementById('resRmb').value) || 0,
      thb: parseFloat(document.getElementById('resThb').value) || 0
    };

    try {
      const result = await window.expenseAPI.addReservation(data);
      if (result.success) {
        showNotification('预约记录添加成功！', 'success');
        reserveForm.reset();
        document.getElementById('resDate').valueAsDate = new Date();
        // 如果添加的是当天的，刷新列表
        if (data.date === reserveQueryDateInput.value) { loadReservations(); }
        await updateInputSuggestions();
      }
    } catch (err) { showNotification('预约失败:' + err.message, 'error'); }
  });
}

// 2. 加载预约列表
async function loadReservations() {
  const date = reserveQueryDateInput.value;
  if (!date) return;
  reserveDateDisplay.textContent = date;

  try {
    const { records, stats } = await window.expenseAPI.getReservations(date);

    // 更新统计卡片
    resTotalUsdtEl.textContent = (stats.totalUsdt || 0).toFixed(2);
    resTotalRmbEl.textContent = '¥' + (stats.totalRmb || 0).toFixed(2);
    resTotalThbEl.textContent = '฿' + (stats.totalThb || 0).toFixed(2);

    // 更新表格
    if (!records || records.length === 0) {
      reserveTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">该日期暂无预约记录</td></tr>';
      return;
    }

    reserveTableBody.innerHTML = records.map(r => `
      <tr>
        <td>${r.name}</td>
        <td><span style="color:#1890ff">${r.exchange_type}</span></td>
        <td>${r.delivery_type}</td>
        <td>${r.location || '-'}</td>
        <td style="font-weight:bold">${r.usdt_amount > 0 ? r.usdt_amount.toFixed(2) : '-'}</td>
        <td style="color:#cf1322">${r.rmb_amount > 0 ? '¥' + r.rmb_amount.toFixed(2) : '-'}</td>
        <td style="color:#389e0d">${r.thb_amount > 0 ? '฿' + r.thb_amount.toFixed(2) : '-'}</td>
        <td><button class="btn-delete" onclick="deleteReservationRecord(${r.id})">删除</button></td>
      </tr>
    `).join('');
  } catch (err) { console.error('加载预约失败', err); }
}

// 3. 删除预约记录
window.deleteReservationRecord = async function (id) {
  if (!confirm('确定删除此预约吗？')) return;
  const result = await window.expenseAPI.deleteReservation(id);
  if (result.success) {
    showNotification('预约已删除', 'success');
    loadReservations();
  }
};

// 4. 预约日期切换监听
if (reserveQueryDateInput) {
  reserveQueryDateInput.addEventListener('change', loadReservations);
}

// --- 原有数据加载与统计显示 ---
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
  startDateInput.value = ''; endDateInput.value = '';
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
    if (activeTab === 'exchangeReserve') loadReservations();
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
  displayedExpenses = new Map((expenses || []).map(expense => [expense.id, expense]));
  if (!expenses || expenses.length === 0) {
    recordsBody.innerHTML = '<tr><td colspan="7">暂无记录</td></tr>';
    return;
  }
  const rows = expenses.map((expense) => `
    <tr>
      <td>${escapeHtml(expense.date)}</td>
      <td>${escapeHtml(expense.name)}</td>
      <td>${(expense.usdt || 0).toFixed(2)}</td>
      <td>¥${(expense.rmb || 0).toFixed(2)}</td>
      <td>฿${(expense.thb || 0).toFixed(2)}</td>
      <td>${escapeHtml(expense.location)}</td>
      <td><button class="btn-edit" onclick="editRecord(${expense.id})">修改</button><button class="btn-delete" onclick="deleteRecord(${expense.id})">删除</button></td>
    </tr>`).join('');
  recordsBody.innerHTML = rows;
}

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = value ?? '';
  return node.innerHTML;
}

window.editRecord = function (id) {
  const expense = displayedExpenses.get(id);
  if (!expense) { showNotification('找不到要修改的记录，请刷新后重试', 'error'); return; }
  editingExpenseId = id;
  dateInput.value = expense.date;
  nameInput.value = expense.name;
  locationInput.value = expense.location;
  nameInput.readOnly = false;
  locationInput.readOnly = false;
  const inputType = ['usdt', 'rmb', 'thb'].includes(expense.input_type) ? expense.input_type : 'usdt';
  setInputType(inputType);
  usdtAmountInput.value = inputType === 'usdt' ? Number(expense.usdt || 0).toFixed(2) : '';
  rmbAmountInput.value = inputType === 'rmb' ? Number(expense.rmb || 0).toFixed(2) : '';
  thbAmountInput.value = inputType === 'thb' ? Number(expense.thb || 0).toFixed(2) : '';
  updateConversionDisplay();
  submitExpenseBtn.textContent = '保存修改';
  cancelEditBtn.hidden = false;
  document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  nameInput.focus();
};

function displayStatistics(stats) {
  totalCountEl.textContent = stats.totalCount || 0;
  totalUsdtEl.textContent = (stats.totalUsdt || 0).toFixed(2);
  totalRmbEl.textContent = '¥' + (stats.totalRmb || 0).toFixed(2);
  totalThbEl.textContent = '฿' + (stats.totalThb || 0).toFixed(2);
  const totalUsdt = stats.totalUsdt || 0;
  grossProfitRmbEl.textContent = `¥${(totalUsdt * 0.4).toFixed(2)} ～ ¥${(totalUsdt * 0.5).toFixed(2)}`;
  displayDateStats(stats.byDate);
  displayLocationStats(stats.byLocation);
  displayDateLocationStats(stats.byDateAndLocation);
}

function displayDateStats(byDate) {
  if (!byDate) { dateStatsEl.innerHTML = '暂无数据'; return; }
  const sortedDates = Object.keys(byDate).sort().reverse();
  dateStatsEl.innerHTML = sortedDates.map(date => {
    const d = byDate[date];
    // 拼接展示三个币种
    return `<div class="stat-item"><b>${date}</b> | USDT: ${d.totalUsdt.toFixed(2)} | RMB: ${d.totalRmb.toFixed(2)} | THB: ${d.totalThb.toFixed(2)}</div>`;
  }).join('');
}

function displayLocationStats(byLocation) {
  if (!byLocation) { locationStatsEl.innerHTML = '暂无数据'; return; }
  const sorted = Object.entries(byLocation).sort((a, b) => b[1].totalThb - a[1].totalThb);
  locationStatsEl.innerHTML = sorted.map(([loc, d]) => `
    <div class="stat-item"><b>${loc}</b> | USDT: ${d.totalUsdt.toFixed(2)} | RMB: ${d.totalRmb.toFixed(2)} | THB: ${d.totalThb.toFixed(2)}</div>`).join('');
}

function displayDateLocationStats(byDateAndLocation) {
  if (!byDateAndLocation || Object.keys(byDateAndLocation).length === 0) {
    dateLocationStatsEl.innerHTML = '暂无数据';
    return;
  }

  // 调试：打开控制台看这里打印出来的内容，确认是否有 date 和 location 字段
  console.log("收到的 byDateAndLocation 数据:", byDateAndLocation);

  const statsArray = Object.values(byDateAndLocation);

  dateLocationStatsEl.innerHTML = statsArray.map(data => {
    // 增加逻辑，如果 data.date 为空，尝试从 key 中解析（如果 key 是 'date_location' 格式）
    const displayDate = data.date || '未知日期';
    const displayLoc = data.location || '未知位置';

    return `
      <div class="stat-item">
        <b>${displayDate} - ${displayLoc}</b> 
        | USDT: ${(data.totalUsdt || 0).toFixed(2)} 
        | RMB: ${(data.totalRmb || 0).toFixed(2)} 
        | THB: ${(data.totalThb || 0).toFixed(2)}
      </div>`;
  }).join('');
}

function showNotification(message, type = 'info') {
  const n = document.createElement('div');
  n.className = `notification ${type}`;
  n.style.cssText = `position:fixed;top:20px;right:20px;padding:10px 20px;background:#333;color:#fff;border-radius:5px;z-index:9999;border-left:5px solid ${type === 'success' ? '#4caf50' : '#f44336'}`;
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
      const pane = document.getElementById(`tab-${target}`);
      if (pane) pane.classList.add('active');
      localStorage.setItem('activeTab', target);
      if (target === 'rank') renderRankChart('name');
      if (target === 'exchangeReserve') loadReservations();
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
    const fillSuggestions = (list, values) => {
      if (!list) return;
      list.replaceChildren(...[...new Set((values || []).filter(Boolean))].map(value => {
        const option = document.createElement('option');
        option.value = value;
        return option;
      }));
    };
    fillSuggestions(nameList, names);
    fillSuggestions(locList, locations);
  } catch (e) { console.error("建议获取失败", e); }
}

window.updateSuggestions = updateInputSuggestions;

window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  initializeTabs();
});


window.deleteRecord = async function (id) {
  if (!confirm('确定要删除吗？')) return;
  const result = await window.expenseAPI.deleteExpense(id);
  if (result.success) {
    await loadAndDisplayData(); // 必须调用这个刷新函数
    showNotification('已删除', 'success');
    await updateInputSuggestions();
    // 删除后显式恢复为可键盘输入的表单，历史建议仅作提示，不会锁定输入内容。
    if (!editingExpenseId) {
      nameInput.readOnly = false;
      locationInput.readOnly = false;
      nameInput.disabled = false;
      locationInput.disabled = false;
    }
  }
};
// 兼容旧代码调用
window.deleteExpense = window.deleteRecord;
window.loadData = loadAndDisplayData;

window.renderRankChart = renderRankChart;
