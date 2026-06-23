const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, 'mesmonitor.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const PORT = 3456;

// MIME 类型映射
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};

// 静态文件服务
function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  if (!MIME[ext]) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
}

// JSON 响应
function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ==================== API 路由 ====================

// GET /api/devices/overview - 设备概览（统计 + 卡片）
function getDeviceOverview(req, res) {
  const stats = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN latest_status='running' THEN 1 ELSE 0 END) AS running,
      SUM(CASE WHEN latest_status='warning' THEN 1 ELSE 0 END) AS warning,
      SUM(CASE WHEN latest_status='error'   THEN 1 ELSE 0 END) AS error
    FROM (
      SELECT ds.status AS latest_status
      FROM devices d
      LEFT JOIN device_status ds ON ds.id = (
        SELECT id FROM device_status WHERE device_id = d.id ORDER BY updated_at DESC LIMIT 1
      )
    )
  `).get();

  const devices = db.prepare(`
    SELECT d.id, d.device_name, d.device_code, ds.status, ds.alarm_info, ds.detail_info
    FROM devices d
    LEFT JOIN device_status ds ON ds.id = (
      SELECT id FROM device_status WHERE device_id = d.id ORDER BY updated_at DESC LIMIT 1
    )
    ORDER BY d.id
  `).all();

  json(res, { stats, devices });
}

// GET /api/devices/:id/alarm - 设备报警历史
function getDeviceAlarm(req, res, id) {
  const device = db.prepare('SELECT device_name FROM devices WHERE id = ?').get(id);
  if (!device) return json(res, { error: '设备不存在' }, 404);

  const logs = db.prepare(`
    SELECT start_time AS time, alarm_info AS message, detail_info
    FROM device_status_history
    WHERE device_id = ?
    ORDER BY start_time DESC
    LIMIT 20
  `).all(id);

  json(res, { device_name: device.device_name, logs });
}

// GET /api/devices/alarm-log - 按设备名称查报警
function getDeviceAlarmByName(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const name = url.searchParams.get('name');
  if (!name) return json(res, { error: '缺少设备名称' }, 400);

  const device = db.prepare('SELECT id, device_name FROM devices WHERE device_name = ?').get(name);
  if (!device) return json(res, { error: '设备不存在' }, 404);

  const logs = db.prepare(`
    SELECT start_time AS time, alarm_info AS message, detail_info
    FROM device_status_history
    WHERE device_id = ?
    ORDER BY start_time DESC
    LIMIT 20
  `).all(device.id);

  json(res, { device_name: device.device_name, logs });
}

// ==================== 热成像模块 ====================

// GET /api/thermal/config - 热成像点位配置
function getThermalConfig(req, res) {
  const configs = db.prepare('SELECT * FROM thermal_alarm_config ORDER BY point_index').all();
  json(res, configs);
}

// GET /api/thermal/latest - 最新热成像记录
function getThermalLatest(req, res) {
  const record = db.prepare(`
    SELECT tr.*, p.product_name
    FROM thermal_records tr
    LEFT JOIN products p ON p.id = tr.product_id
    ORDER BY tr.record_time DESC LIMIT 1
  `).get();

  if (!record) {
    // 无记录时返回默认点位温度
    const defaults = [];
    for (let i = 1; i <= 20; i++) {
      defaults.push({ point_name: `点位${String(i).padStart(2, '0')}`, point_index: i, temperature: (68 + Math.random() * 7).toFixed(1) });
    }
    return json(res, { record: null, points: defaults });
  }

  const points = db.prepare('SELECT * FROM thermal_point_temps WHERE record_id = ? ORDER BY point_index').all(record.id);
  json(res, { record, points: points.length > 0 ? points : [] });
}

// ==================== 模具配方模块 ====================

// GET /api/recipes - 模具配方搜索
function searchRecipes(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const product = url.searchParams.get('product') || '';
  const mold = url.searchParams.get('mold') || '';
  const line = url.searchParams.get('line') || '';

  let sql = `
    SELECT mr.*, m.mold_name
    FROM mold_recipes mr
    LEFT JOIN molds m ON m.id = mr.mold_id
    WHERE 1=1
  `;
  const params = [];

  if (product) { sql += ' AND mr.product_name LIKE ?'; params.push(`%${product}%`); }
  if (mold) { sql += ' AND m.mold_name LIKE ?'; params.push(`%${mold}%`); }
  if (line) { sql += ' AND mr.production_line LIKE ?'; params.push(`%${line}%`); }

  const results = db.prepare(sql).all(...params);
  json(res, results);
}

// ==================== 管路数据模块 ====================

// GET /api/pipeline - 获取管路参数
function getPipeline(req, res) {
  const params = db.prepare('SELECT * FROM pipeline_params ORDER BY id').all();
  json(res, params);
}

// POST /api/pipeline/update - 更新管路参数
function updatePipeline(req, res, body) {
  const { pressure, temperature, flow, valve } = body;
  const updates = [
    { name: '压力设定', value: pressure },
    { name: '温度设定', value: temperature },
    { name: '流量设定', value: flow },
    { name: '阀门开度', value: valve },
  ];

  const updateStmt = db.prepare('UPDATE pipeline_params SET param_value = ?, updated_at = datetime(\'now\',\'localtime\') WHERE param_name = ?');
  const logStmt = db.prepare('INSERT INTO pipeline_edit_log (param_name, old_value, new_value, edit_time) VALUES (?, ?, ?, datetime(\'now\',\'localtime\'))');

  const transaction = db.transaction(() => {
    for (const u of updates) {
      if (u.value == null || isNaN(Number(u.value))) continue;
      const old = db.prepare('SELECT param_value FROM pipeline_params WHERE param_name = ?').get(u.name);
      updateStmt.run(Number(u.value), u.name);
      logStmt.run(u.name, old ? old.param_value : 0, Number(u.value));
    }
  });

  try {
    transaction();
    const params = db.prepare('SELECT * FROM pipeline_params ORDER BY id').all();
    json(res, { success: true, data: params });
  } catch (e) {
    json(res, { success: false, error: e.message }, 500);
  }
}

// ==================== 安灯呼叫模块 ====================

// GET /api/andon/types - 呼叫类型
function getAndonTypes(req, res) {
  const types = db.prepare('SELECT * FROM andon_call_types WHERE is_active = 1 ORDER BY sort_order').all();
  json(res, types);
}

// GET /api/andon/calls - 呼叫记录
function getAndonCalls(req, res) {
  const calls = db.prepare('SELECT * FROM andon_calls ORDER BY call_time DESC LIMIT 50').all();
  json(res, calls);
}

// POST /api/andon/call - 发起呼叫
function createAndonCall(req, res, body) {
  const { call_type, call_detail, caller } = body;
  if (!call_type) return json(res, { error: '缺少呼叫类型' }, 400);

  const result = db.prepare(`
    INSERT INTO andon_calls (call_type, call_detail, caller, call_time, status)
    VALUES (?, ?, ?, datetime('now','localtime'), 'pending')
  `).run(call_type, call_detail || '', caller || '系统自动');

  const record = db.prepare('SELECT * FROM andon_calls WHERE id = ?').get(result.lastInsertRowid);
  json(res, { success: true, call: record });
}

// ==================== 工艺数据模块 ====================

// GET /api/process/data - 工艺数据查询
function getProcessData(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = parseInt(url.searchParams.get('pageSize')) || 10;
  const device = url.searchParams.get('device') || '';
  const product = url.searchParams.get('product') || '';
  const batch = url.searchParams.get('batch') || '';
  const startTime = url.searchParams.get('startTime') || '';
  const endTime = url.searchParams.get('endTime') || '';
  const status = url.searchParams.get('status') || '';

  let where = 'WHERE 1=1';
  const params = [];

  if (device) { where += ' AND device_code = ?'; params.push(device); }
  if (product) { where += ' AND product_model = ?'; params.push(product); }
  if (batch) { where += ' AND batch_no LIKE ?'; params.push(`%${batch}%`); }
  if (startTime) { where += ' AND collect_time >= ?'; params.push(startTime); }
  if (endTime) { where += ' AND collect_time <= ?'; params.push(endTime); }
  if (status) { where += ' AND data_status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) AS cnt FROM process_data ${where}`).get(...params).cnt;
  const offset = (page - 1) * pageSize;
  const data = db.prepare(`SELECT * FROM process_data ${where} ORDER BY collect_time DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

  json(res, { total, page, pageSize, data });
}

// GET /api/process/filters - 工艺筛选项
function getProcessFilters(req, res) {
  const devices = db.prepare('SELECT DISTINCT device_code FROM process_data ORDER BY device_code').all();
  const products = db.prepare('SELECT DISTINCT product_model FROM process_data ORDER BY product_model').all();
  json(res, {
    devices: devices.map(d => d.device_code),
    products: products.map(p => p.product_model),
  });
}

// ==================== 历史工件分析模块 ====================

// GET /api/analysis/standards - 分析标准参数
function getAnalysisStandards(req, res) {
  const standards = db.prepare('SELECT * FROM analysis_standards WHERE is_active = 1 ORDER BY display_order').all();
  json(res, standards);
}

// GET /api/analysis/data - 工件分析数据
function getAnalysisData(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = parseInt(url.searchParams.get('pageSize')) || 10;
  const keyword = url.searchParams.get('keyword') || '';
  const device = url.searchParams.get('device') || '';

  let where = 'WHERE 1=1';
  const params = [];

  if (keyword) { where += ' AND (workpiece_no LIKE ? OR batch_no LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  if (device) { where += ' AND device_code = ?'; params.push(device); }

  const total = db.prepare(`SELECT COUNT(*) AS cnt FROM workpiece_analysis ${where}`).get(...params).cnt;
  const offset = (page - 1) * pageSize;
  const data = db.prepare(`SELECT * FROM workpiece_analysis ${where} ORDER BY collect_time DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

  // 获取标准参数用于计算差值
  const standards = db.prepare('SELECT * FROM analysis_standards WHERE is_active = 1 ORDER BY display_order').all();
  const unqualified = db.prepare(`SELECT COUNT(*) AS cnt FROM workpiece_analysis ${where} AND judge_result='unqualified'`).get(...params).cnt;
  const unqualifiedRate = total > 0 ? ((unqualified / total) * 100).toFixed(1) : '0.0';

  json(res, { total, page, pageSize, unqualifiedRate, standards, data });
}

// GET /api/analysis/filters - 分析筛选项
function getAnalysisFilters(req, res) {
  const devices = db.prepare('SELECT DISTINCT device_code FROM workpiece_analysis ORDER BY device_code').all();
  json(res, {
    devices: devices.map(d => d.device_code),
  });
}

// ==================== HTTP 服务器 ====================
const server = http.createServer((req, res) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // POST 请求体解析
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = {}; }
      handleRoute(req, res, pathname, parsed);
    });
    return;
  }

  handleRoute(req, res, pathname, null);
});

function handleRoute(req, res, pathname, body) {
  // API 路由
  if (pathname === '/api/devices/overview') return getDeviceOverview(req, res);
  if (pathname === '/api/devices/alarm-log') return getDeviceAlarmByName(req, res);

  // 热成像
  if (pathname === '/api/thermal/config') return getThermalConfig(req, res);
  if (pathname === '/api/thermal/latest') return getThermalLatest(req, res);

  // 模具配方
  if (pathname === '/api/recipes') return searchRecipes(req, res);

  // 管路数据
  if (pathname === '/api/pipeline' && req.method === 'GET') return getPipeline(req, res);
  if (pathname === '/api/pipeline/update' && req.method === 'POST') return updatePipeline(req, res, body);

  // 安灯呼叫
  if (pathname === '/api/andon/types') return getAndonTypes(req, res);
  if (pathname === '/api/andon/calls') return getAndonCalls(req, res);
  if (pathname === '/api/andon/call' && req.method === 'POST') return createAndonCall(req, res, body);

  // 工艺数据
  if (pathname === '/api/process/data') return getProcessData(req, res);
  if (pathname === '/api/process/filters') return getProcessFilters(req, res);

  // 工件分析
  if (pathname === '/api/analysis/standards') return getAnalysisStandards(req, res);
  if (pathname === '/api/analysis/data') return getAnalysisData(req, res);
  if (pathname === '/api/analysis/filters') return getAnalysisFilters(req, res);

  // 静态文件
  serveStatic(req, res);
}

server.listen(PORT, () => {
  console.log(`✅ MES Monitor API 服务已启动: http://localhost:${PORT}`);
  console.log(`📊 数据库: ${path.join(__dirname, 'mesmonitor.db')}`);
});
