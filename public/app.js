let fitChart = null;
let errorChart = null;
let currentReportId = null;

const chartColors = {
  grid: 'rgba(148, 163, 184, 0.15)',
  tick: '#94a3b8',
  title: '#94a3b8',
  normal: '#3b82f6',
  normalGlow: 'rgba(59, 130, 246, 0.5)',
  outlier: '#ef4444',
  outlierGlow: 'rgba(239, 68, 68, 0.5)',
  fitLine: '#10b981',
  fitLineGlow: 'rgba(16, 185, 129, 0.5)',
  idealLine: '#f59e0b',
  error: '#6366f1',
  errorGlow: 'rgba(99, 102, 241, 0.5)',
  tolerance: '#ef4444',
  tooltipBg: 'rgba(15, 23, 42, 0.95)'
};

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.className = `toast ${type} show`;
  toast.textContent = message;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function setStatusBadge(status) {
  const badge = document.getElementById('statusBadge');
  const dot = badge.querySelector('.badge-dot');
  const text = badge.querySelector('.badge-text');
  badge.className = 'header-badge';
  if (status === 'pass') {
    badge.classList.add('status-pass');
    text.textContent = '校准通过';
  } else if (status === 'fail') {
    badge.classList.add('status-fail');
    text.textContent = '校准失败';
  } else {
    badge.classList.add('status-pending');
    text.textContent = '待校准';
  }
}

function initCharts() {
  const fitCtx = document.getElementById('fitChart').getContext('2d');
  const errorCtx = document.getElementById('errorChart').getContext('2d');

  fitChart = new Chart(fitCtx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '校准点(合格)',
          data: [],
          backgroundColor: chartColors.normal,
          borderColor: chartColors.normal,
          pointRadius: 8,
          pointHoverRadius: 11,
          pointBorderWidth: 2,
          showLine: false
        },
        {
          label: '校准点(超差)',
          data: [],
          backgroundColor: chartColors.outlier,
          borderColor: chartColors.outlier,
          pointRadius: 10,
          pointHoverRadius: 13,
          pointBorderWidth: 3,
          pointStyle: 'rectRot',
          showLine: false
        },
        {
          label: '拟合线',
          data: [],
          borderColor: chartColors.fitLine,
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 0,
          showLine: true,
          tension: 0.1,
          fill: false
        },
        {
          label: '理想线 (y=x)',
          data: [],
          borderColor: chartColors.idealLine,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          showLine: true,
          tension: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: chartColors.tooltipBg,
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          titleFont: { size: 13, weight: '600', family: 'Noto Sans SC' },
          bodyFont: { size: 12, family: 'JetBrains Mono' },
          padding: 12,
          cornerRadius: 8,
          borderColor: 'rgba(75, 85, 99, 0.5)',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const x = context.parsed.x?.toFixed(4) || 0;
              const y = context.parsed.y?.toFixed(4) || 0;
              return `标准值: ${x}  测量值: ${y}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          grid: { color: chartColors.grid, drawBorder: false },
          ticks: { font: { size: 11, family: 'JetBrains Mono' }, color: chartColors.tick },
          title: { display: true, text: '标准值 (Standard)', font: { size: 12, weight: '600', family: 'Noto Sans SC' }, color: chartColors.title }
        },
        y: {
          grid: { color: chartColors.grid, drawBorder: false },
          ticks: { font: { size: 11, family: 'JetBrains Mono' }, color: chartColors.tick },
          title: { display: true, text: '测量值 (Measured)', font: { size: 12, weight: '600', family: 'Noto Sans SC' }, color: chartColors.title }
        }
      }
    }
  });

  errorChart = new Chart(errorCtx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '误差(合格)',
          data: [],
          backgroundColor: chartColors.error,
          borderColor: chartColors.error,
          pointRadius: 8,
          pointHoverRadius: 11,
          pointBorderWidth: 2,
          showLine: false
        },
        {
          label: '误差(超差)',
          data: [],
          backgroundColor: chartColors.outlier,
          borderColor: chartColors.outlier,
          pointRadius: 10,
          pointHoverRadius: 13,
          pointBorderWidth: 3,
          pointStyle: 'rectRot',
          showLine: false
        },
        {
          label: '零误差线',
          data: [],
          borderColor: '#64748b',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          showLine: true,
          tension: 0,
          fill: false
        },
        {
          label: '容差上界',
          data: [],
          borderColor: chartColors.tolerance,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 0,
          showLine: true,
          tension: 0,
          fill: false
        },
        {
          label: '容差下界',
          data: [],
          borderColor: chartColors.tolerance,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 0,
          showLine: true,
          tension: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: chartColors.tooltipBg,
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          titleFont: { size: 13, weight: '600', family: 'Noto Sans SC' },
          bodyFont: { size: 12, family: 'JetBrains Mono' },
          padding: 12,
          cornerRadius: 8,
          borderColor: 'rgba(75, 85, 99, 0.5)',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              if (context.datasetIndex <= 1) {
                const x = context.parsed.x?.toFixed(4) || 0;
                const y = context.parsed.y?.toFixed(6) || 0;
                return `标准值: ${x}  绝对误差: ${y}`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          grid: { color: chartColors.grid, drawBorder: false },
          ticks: { font: { size: 11, family: 'JetBrains Mono' }, color: chartColors.tick },
          title: { display: true, text: '标准值 (Standard)', font: { size: 12, weight: '600', family: 'Noto Sans SC' }, color: chartColors.title }
        },
        y: {
          grid: { color: chartColors.grid, drawBorder: false },
          ticks: { font: { size: 11, family: 'JetBrains Mono' }, color: chartColors.tick },
          title: { display: true, text: '绝对误差 (Measured - Standard)', font: { size: 12, weight: '600', family: 'Noto Sans SC' }, color: chartColors.title }
        }
      }
    }
  });
}

function addCalibrationRow(standard = '', measured = '', tolerance = '') {
  const tbody = document.getElementById('dataTableBody');
  const rowIndex = tbody.children.length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${rowIndex}</td>
    <td><input type="number" step="any" class="standard-input" value="${standard}" placeholder="标准值"></td>
    <td><input type="number" step="any" class="measured-input" value="${measured}" placeholder="测量值"></td>
    <td><input type="number" step="any" class="tolerance-input" value="${tolerance}" placeholder="允许误差"></td>
    <td><button class="delete-row-btn" title="删除">✕</button></td>
  `;
  tr.querySelector('.delete-row-btn').addEventListener('click', () => {
    tr.remove();
    updateRowNumbers();
  });
  tbody.appendChild(tr);
}

function updateRowNumbers() {
  const tbody = document.getElementById('dataTableBody');
  Array.from(tbody.children).forEach((tr, idx) => {
    tr.querySelector('td:first-child').textContent = idx + 1;
  });
}

function clearAllData() {
  const tbody = document.getElementById('dataTableBody');
  tbody.innerHTML = '';
  document.getElementById('deviceId').value = '';
  document.getElementById('deviceName').value = '';
  document.getElementById('operator').value = '';
  document.getElementById('calibrationDate').value = new Date().toISOString().split('T')[0];
  for (let i = 0; i < 6; i++) addCalibrationRow();
  currentReportId = null;
  setStatusBadge('pending');
  resetDisplay();
}

function resetDisplay() {
  document.getElementById('metricR2').textContent = '—';
  document.getElementById('metricRMSE').textContent = '—';
  document.getElementById('metricMAE').textContent = '—';
  document.getElementById('eqFormula').textContent = '等待校准...';
  document.getElementById('resultBanner').style.display = 'none';
  document.getElementById('analysisTableBody').innerHTML = '<tr class="empty-row"><td colspan="8">请执行校准后查看详细分析结果</td></tr>';

  if (fitChart) {
    fitChart.data.datasets.forEach(ds => ds.data = []);
    fitChart.update();
  }
  if (errorChart) {
    errorChart.data.datasets.forEach(ds => ds.data = []);
    errorChart.update();
  }
}

function loadSampleData() {
  const samples = [
    { standard: 0, measured: 0.02, tolerance: 0.05 },
    { standard: 10, measured: 9.97, tolerance: 0.08 },
    { standard: 20, measured: 20.15, tolerance: 0.10 },
    { standard: 50, measured: 50.22, tolerance: 0.15 },
    { standard: 100, measured: 99.78, tolerance: 0.20 },
    { standard: 150, measured: 150.55, tolerance: 0.25 },
    { standard: 200, measured: 200.12, tolerance: 0.30 }
  ];
  document.getElementById('deviceId').value = 'FLUKE-8846A-2024-001';
  document.getElementById('deviceName').value = '六位半数字万用表';
  document.getElementById('operator').value = '李工程师';
  document.getElementById('calibrationDate').value = new Date().toISOString().split('T')[0];

  const tbody = document.getElementById('dataTableBody');
  tbody.innerHTML = '';
  samples.forEach(s => addCalibrationRow(s.standard, s.measured, s.tolerance));
  currentReportId = null;
  setStatusBadge('pending');
  resetDisplay();
  showToast('已加载示例校准数据', 'success');
}

function getCalibrationData() {
  const tbody = document.getElementById('dataTableBody');
  const points = [];
  Array.from(tbody.children).forEach(tr => {
    const sInput = tr.querySelector('.standard-input');
    const mInput = tr.querySelector('.measured-input');
    const tInput = tr.querySelector('.tolerance-input');
    const standard = parseFloat(sInput.value);
    const measured = parseFloat(mInput.value);
    const tolerance = parseFloat(tInput.value);
    if (!isNaN(standard) && !isNaN(measured) && !isNaN(tolerance)) {
      points.push({ standard, measured, tolerance });
    }
  });
  return points;
}

function setCalibrationData(points) {
  const tbody = document.getElementById('dataTableBody');
  tbody.innerHTML = '';
  points.forEach(p => addCalibrationRow(p.standard, p.measured, p.tolerance));
}

async function performCalibration() {
  const deviceId = document.getElementById('deviceId').value.trim();
  if (!deviceId) {
    showToast('请输入设备编号', 'error');
    return;
  }

  const calibrationPoints = getCalibrationData();
  if (calibrationPoints.length < 2) {
    showToast('请至少输入2个有效校准点', 'error');
    return;
  }

  const deviceName = document.getElementById('deviceName').value.trim();
  const calibrationDate = document.getElementById('calibrationDate').value;
  const operator = document.getElementById('operator').value.trim();

  const btn = document.getElementById('calibrateBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="btn-icon">⏳</span> 校准计算中...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/calibrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, deviceName, calibrationDate, operator, calibrationPoints, modelType: 'linear' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '校准失败');

    displayCalibrationResult(data);
    currentReportId = data.id;
    setStatusBadge(data.passed ? 'pass' : 'fail');
    showToast(data.passed ? '校准完成，所有点合格！' : `校准完成，有 ${data.outOfToleranceCount} 个点超差！`, data.passed ? 'success' : 'error');
    loadReports();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function displayCalibrationResult(result) {
  document.getElementById('metricR2').textContent = result.metrics.rSquared.toFixed(6);
  document.getElementById('metricRMSE').textContent = result.metrics.rmse.toFixed(6);
  document.getElementById('metricMAE').textContent = result.metrics.mae.toFixed(6);
  document.getElementById('eqFormula').textContent = result.modelEquation;

  const banner = document.getElementById('resultBanner');
  banner.style.display = 'flex';
  banner.className = `result-banner ${result.passed ? 'pass' : 'fail'}`;
  document.getElementById('resultIcon').textContent = result.passed ? '✓' : '✕';
  document.getElementById('resultTitle').textContent = result.passed ? '校准通过' : '校准不通过';
  document.getElementById('resultDesc').textContent = result.passed
    ? `全部 ${result.calibrationPoints.length} 个校准点均在允许误差范围内`
    : `共 ${result.outOfToleranceCount} 个校准点超出允许误差范围，请检查设备`;

  const normalPoints = [];
  const outlierPoints = [];
  result.calibrationPoints.forEach(p => {
    const pt = { x: p.standard, y: p.measured };
    if (p.isOutOfTolerance) outlierPoints.push(pt);
    else normalPoints.push(pt);
  });

  const xs = result.calibrationPoints.map(p => p.standard);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const range = maxX - minX || 1;
  const extMin = minX - range * 0.05;
  const extMax = maxX + range * 0.05;
  const idealLine = [{ x: extMin, y: extMin }, { x: extMax, y: extMax }];

  fitChart.data.datasets[0].data = normalPoints;
  fitChart.data.datasets[1].data = outlierPoints;
  fitChart.data.datasets[2].data = result.curvePoints;
  fitChart.data.datasets[3].data = idealLine;
  fitChart.update();

  const normalErrors = [];
  const outlierErrors = [];
  const upperTol = [];
  const lowerTol = [];
  result.calibrationPoints.forEach(p => {
    const ep = { x: p.standard, y: p.absoluteError };
    if (p.isOutOfTolerance) outlierErrors.push(ep);
    else normalErrors.push(ep);
    upperTol.push({ x: p.standard, y: p.tolerance });
    lowerTol.push({ x: p.standard, y: -p.tolerance });
  });
  const zeroLine = [{ x: extMin, y: 0 }, { x: extMax, y: 0 }];

  errorChart.data.datasets[0].data = normalErrors;
  errorChart.data.datasets[1].data = outlierErrors;
  errorChart.data.datasets[2].data = zeroLine;
  errorChart.data.datasets[3].data = upperTol;
  errorChart.data.datasets[4].data = lowerTol;
  errorChart.update();

  const analysisBody = document.getElementById('analysisTableBody');
  analysisBody.innerHTML = result.calibrationPoints.map((p, i) => {
    const errClass = p.absoluteError < 0 ? 'negative' : (p.absoluteError > 0 ? 'positive' : '');
    const tolClass = p.isOutOfTolerance ? 'out-of-tolerance' : '';
    const rowClass = p.isOutOfTolerance ? 'class="out-of-tolerance"' : '';
    return `<tr ${rowClass}>
      <td>${i + 1}</td>
      <td>${p.standard.toFixed(4)}</td>
      <td>${p.measured.toFixed(4)}</td>
      <td>${p.predicted.toFixed(4)}</td>
      <td class="error-value ${errClass} ${tolClass}">${p.absoluteError >= 0 ? '+' : ''}${p.absoluteError.toFixed(4)}</td>
      <td class="error-value ${errClass} ${tolClass}">${p.relativeError !== null && p.relativeError !== undefined && !isNaN(p.relativeError) ? (p.relativeError >= 0 ? '+' : '') + p.relativeError.toFixed(4) + '%' : 'N/A'}</td>
      <td>±${p.tolerance.toFixed(4)}</td>
      <td><span class="status-tag ${p.isOutOfTolerance ? 'fail' : 'pass'}">${p.isOutOfTolerance ? '● 超差' : '✓ 合格'}</span></td>
    </tr>`;
  }).join('');
}

async function loadReports() {
  try {
    const res = await fetch('/api/reports');
    const reports = await res.json();
    const list = document.getElementById('reportsList');

    if (reports.length === 0) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>暂无校准报告</p>
        <span>执行校准后报告将自动保存</span>
      </div>`;
      return;
    }

    list.innerHTML = reports.map(r => {
      const date = new Date(r.createdAt).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      return `<div class="report-item ${r.passed ? 'pass' : 'fail'}" data-id="${r.id}">
        <div class="report-device">${r.deviceId}</div>
        <div class="report-device-name">${r.deviceName || '未命名设备'}</div>
        <div class="report-meta">
          <span>${r.pointsCount} 个校准点</span>
          <span class="report-status ${r.passed ? 'pass' : 'fail'}">${r.passed ? '✓ 通过' : '✕ 超差'}</span>
        </div>
        <div class="report-meta" style="margin-bottom:0;">
          <span>${date}</span>
          ${r.outOfToleranceCount > 0 ? `<span style="color:#fca5a5;">超差 ${r.outOfToleranceCount}</span>` : ''}
        </div>
        <div class="report-actions">
          <button class="btn-view" onclick="viewReport('${r.id}')">查看报告</button>
          <button class="btn-delete-report" onclick="deleteReport('${r.id}')">删除</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    console.error('加载报告失败:', err);
  }
}

async function viewReport(id) {
  try {
    const res = await fetch(`/api/reports/${id}`);
    const report = await res.json();
    if (!res.ok) throw new Error(report.error);
    showReportModal(report);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showReportModal(report) {
  const modal = document.getElementById('reportModal');
  const body = document.getElementById('modalBody');

  const calibrationDate = report.calibrationDate || '—';
  const operator = report.operator || '—';
  const createdAt = new Date(report.createdAt).toLocaleString('zh-CN');

  body.innerHTML = `
    <div class="report-summary">
      <div class="summary-card">
        <div class="label">设备编号</div>
        <div class="value">${report.deviceId}</div>
      </div>
      <div class="summary-card">
        <div class="label">设备名称</div>
        <div class="value">${report.deviceName || '—'}</div>
      </div>
      <div class="summary-card">
        <div class="label">校准日期</div>
        <div class="value">${calibrationDate}</div>
      </div>
      <div class="summary-card">
        <div class="label">操作员</div>
        <div class="value">${operator}</div>
      </div>
      <div class="summary-card result-${report.passed ? 'pass' : 'fail'}">
        <div class="label">校准结果</div>
        <div class="value">${report.passed ? '✓ 合格通过' : '✕ 存在超差'}</div>
      </div>
      <div class="summary-card">
        <div class="label">报告生成时间</div>
        <div class="value" style="font-size:13px;">${createdAt}</div>
      </div>
    </div>

    <div class="modal-section-title">拟合指标</div>
    <div class="modal-metrics">
      <div class="metric-card">
        <div class="metric-name">R²</div>
        <div class="metric-val">${report.metrics.rSquared.toFixed(6)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-name">RMSE</div>
        <div class="metric-val">${report.metrics.rmse.toFixed(6)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-name">MAE</div>
        <div class="metric-val">${report.metrics.mae.toFixed(6)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-name">超差点数</div>
        <div class="metric-val" style="color:${report.outOfToleranceCount > 0 ? '#fca5a5' : '#6ee7b7'}">${report.outOfToleranceCount}</div>
      </div>
    </div>

    <div class="modal-section-title">拟合方程</div>
    <div class="equation-display" style="margin-bottom:16px;">
      <span class="eq-label">校准曲线拟合结果</span>
      <span class="eq-formula">${report.modelEquation}</span>
    </div>

    <div class="modal-section-title">校准点明细</div>
    <div style="overflow-x:auto;">
      <table class="modal-table">
        <thead>
          <tr>
            <th>#</th>
            <th>标准值</th>
            <th>测量值</th>
            <th>拟合值</th>
            <th>绝对误差</th>
            <th>相对误差</th>
            <th>允许误差</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${report.calibrationPoints.map((p, i) => {
            const tolClass = p.isOutOfTolerance ? 'out-of-tolerance' : '';
            const errClass = p.absoluteError < 0 ? 'negative' : (p.absoluteError > 0 ? 'positive' : '');
            const rowClass = p.isOutOfTolerance ? 'class="out-of-tolerance"' : '';
            return `<tr ${rowClass}>
              <td>${i + 1}</td>
              <td>${p.standard.toFixed(4)}</td>
              <td>${p.measured.toFixed(4)}</td>
              <td>${p.predicted.toFixed(4)}</td>
              <td class="error-value ${errClass} ${tolClass}">${p.absoluteError >= 0 ? '+' : ''}${p.absoluteError.toFixed(4)}</td>
              <td class="error-value ${errClass} ${tolClass}">${p.relativeError !== null && p.relativeError !== undefined && !isNaN(p.relativeError) ? (p.relativeError >= 0 ? '+' : '') + p.relativeError.toFixed(4) + '%' : 'N/A'}</td>
              <td>±${p.tolerance.toFixed(4)}</td>
              <td><span class="status-tag ${p.isOutOfTolerance ? 'fail' : 'pass'}">${p.isOutOfTolerance ? '● 超差' : '✓ 合格'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('reportModal').style.display = 'none';
}

async function deleteReport(id) {
  if (!confirm('确定删除这份校准报告吗？')) return;
  try {
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    if (currentReportId === id) {
      currentReportId = null;
    }
    showToast('报告已删除', 'success');
    loadReports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initEventListeners() {
  document.getElementById('addRowBtn').addEventListener('click', () => addCalibrationRow());
  document.getElementById('clearDataBtn').addEventListener('click', () => {
    if (confirm('确定清空所有数据吗？')) clearAllData();
  });
  document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);
  document.getElementById('calibrateBtn').addEventListener('click', performCalibration);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('reportModal').addEventListener('click', (e) => {
    if (e.target.id === 'reportModal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function init() {
  initCharts();
  initEventListeners();
  document.getElementById('calibrationDate').value = new Date().toISOString().split('T')[0];
  for (let i = 0; i < 6; i++) addCalibrationRow();
  loadReports();
  setStatusBadge('pending');
}

document.addEventListener('DOMContentLoaded', init);
