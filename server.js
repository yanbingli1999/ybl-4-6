const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const math = require('mathjs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(REPORTS_FILE)) {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2));
  }
}
ensureDataFiles();

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function linearRegression(points) {
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  points.forEach(p => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  });
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { a: slope, b: intercept };
}

function calculateMetrics(points, modelType, params) {
  const n = points.length;
  let yMean = 0;
  points.forEach(p => yMean += p.y);
  yMean /= n;

  let ssTotal = 0;
  let ssResidual = 0;
  const residuals = [];
  let maeSum = 0;
  let rmseSum = 0;

  points.forEach(p => {
    let predicted;
    switch (modelType) {
      case 'linear':
        predicted = params.a * p.x + params.b;
        break;
    }
    const residual = p.y - predicted;
    residuals.push(residual);
    ssResidual += residual * residual;
    ssTotal += (p.y - yMean) * (p.y - yMean);
    maeSum += Math.abs(residual);
    rmseSum += residual * residual;
  });

  const rSquared = 1 - (ssResidual / ssTotal);
  const mse = ssResidual / n;
  const rmse = Math.sqrt(rmseSum / n);
  const mae = maeSum / n;

  return { rSquared, mse, rmse, mae, residuals };
}

function generateCurvePoints(points, modelType, params, numPoints = 100) {
  const xs = points.map(p => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const range = maxX - minX || 1;
  const extendedMin = minX - range * 0.05;
  const extendedMax = maxX + range * 0.05;
  const step = (extendedMax - extendedMin) / (numPoints - 1);
  const curvePoints = [];
  for (let i = 0; i < numPoints; i++) {
    const x = extendedMin + i * step;
    let y;
    switch (modelType) {
      case 'linear':
        y = params.a * x + params.b;
        break;
    }
    curvePoints.push({ x, y });
  }
  return curvePoints;
}

app.get('/api/reports', (req, res) => {
  const reports = readJsonFile(REPORTS_FILE);
  const summaries = reports.map(r => ({
    id: r.id,
    deviceId: r.deviceId,
    deviceName: r.deviceName,
    calibrationDate: r.calibrationDate,
    operator: r.operator,
    passed: r.passed,
    outOfToleranceCount: r.outOfToleranceCount,
    pointsCount: r.calibrationPoints.length,
    createdAt: r.createdAt
  }));
  res.json(summaries);
});

app.get('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  const reports = readJsonFile(REPORTS_FILE);
  const report = reports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: '报告不存在' });
  }
  res.json(report);
});

app.delete('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  let reports = readJsonFile(REPORTS_FILE);
  const initialLength = reports.length;
  reports = reports.filter(r => r.id !== id);
  if (reports.length === initialLength) {
    return res.status(404).json({ error: '报告不存在' });
  }
  writeJsonFile(REPORTS_FILE, reports);
  res.json({ success: true });
});

app.post('/api/calibrate', (req, res) => {
  const {
    deviceId,
    deviceName,
    calibrationDate,
    operator,
    calibrationPoints,
    modelType = 'linear'
  } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: '请输入设备编号' });
  }
  if (!calibrationPoints || !Array.isArray(calibrationPoints) || calibrationPoints.length < 2) {
    return res.status(400).json({ error: '至少需要2个校准点' });
  }

  for (let i = 0; i < calibrationPoints.length; i++) {
    const pt = calibrationPoints[i];
    if (pt.standard === undefined || pt.standard === null || isNaN(pt.standard)) {
      return res.status(400).json({ error: `第${i + 1}个校准点的标准值无效` });
    }
    if (pt.measured === undefined || pt.measured === null || isNaN(pt.measured)) {
      return res.status(400).json({ error: `第${i + 1}个校准点的测量值无效` });
    }
    if (pt.tolerance === undefined || pt.tolerance === null || isNaN(pt.tolerance)) {
      return res.status(400).json({ error: `第${i + 1}个校准点的允许误差无效` });
    }
  }

  const points = calibrationPoints.map(pt => ({
    x: pt.standard,
    y: pt.measured
  }));

  let params;
  let modelEquation;
  try {
    switch (modelType) {
      case 'linear':
      default:
        params = linearRegression(points);
        modelEquation = `y = ${params.a.toFixed(6)}x + ${params.b.toFixed(6)}`;
        break;
    }
  } catch (e) {
    return res.status(400).json({ error: '拟合计算失败: ' + e.message });
  }

  const metrics = calculateMetrics(points, modelType, params);
  const curvePoints = generateCurvePoints(points, modelType, params);

  const analyzedPoints = calibrationPoints.map((pt, idx) => {
    const predicted = params.a * pt.standard + params.b;
    const absoluteError = pt.measured - pt.standard;
    const relativeError = pt.standard !== 0 ? (absoluteError / pt.standard) * 100 : 0;
    const fittedError = pt.measured - predicted;
    const isOutOfTolerance = Math.abs(absoluteError) > pt.tolerance;
    return {
      ...pt,
      predicted,
      absoluteError,
      relativeError,
      fittedError,
      isOutOfTolerance
    };
  });

  const outOfToleranceCount = analyzedPoints.filter(p => p.isOutOfTolerance).length;
  const passed = outOfToleranceCount === 0;

  const result = {
    id: generateId(),
    deviceId,
    deviceName: deviceName || '',
    calibrationDate: calibrationDate || new Date().toISOString().split('T')[0],
    operator: operator || '',
    modelType,
    params,
    modelEquation,
    metrics: {
      rSquared: metrics.rSquared,
      mse: metrics.mse,
      rmse: metrics.rmse,
      mae: metrics.mae
    },
    calibrationPoints: analyzedPoints,
    curvePoints,
    residuals: metrics.residuals,
    passed,
    outOfToleranceCount,
    createdAt: new Date().toISOString()
  };

  const reports = readJsonFile(REPORTS_FILE);
  reports.unshift(result);
  if (reports.length > 100) {
    reports.length = 100;
  }
  writeJsonFile(REPORTS_FILE, reports);

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`仪器校准任务面板 服务器已启动: http://localhost:${PORT}`);
});
