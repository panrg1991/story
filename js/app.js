// ========== API 基础工具 ==========
const API_BASE = '';

function apiGet(path) {
  return fetch(API_BASE + path).then(function(r) {
    if (!r.ok) throw new Error('API error: ' + r.status);
    return r.json();
  });
}

function apiPost(path, data) {
  return fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(function(r) {
    if (!r.ok) throw new Error('API error: ' + r.status);
    return r.json();
  });
}

// ========== 页面切换 ==========
document.querySelectorAll('.nav-link').forEach(function(link) {
  link.addEventListener('click', function() {
    var page = this.getAttribute('data-page');

    document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
    this.classList.add('active');

    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById(page).classList.add('active');

    // 切换到对应页面时加载数据
    if (page === 'home') loadDeviceOverview();
    else if (page === 'thermal') loadThermalData();
    else if (page === 'pipeline') loadPipelineData();
    else if (page === 'andon') loadAndonData();
    else if (page === 'process') loadProcessFilters();
    else if (page === 'analysis') loadAnalysisData();
  });
});

// ========== 实时时钟 ==========
function updateTime() {
  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth() + 1).padStart(2, '0');
  var d = String(now.getDate()).padStart(2, '0');
  var h = String(now.getHours()).padStart(2, '0');
  var min = String(now.getMinutes()).padStart(2, '0');
  var s = String(now.getSeconds()).padStart(2, '0');
  var weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  var w = weekdays[now.getDay()];
  document.getElementById('currentTime').textContent = y + '-' + m + '-' + d + ' ' + h + ':' + min + ':' + s + ' ' + w;
}
updateTime();
setInterval(updateTime, 1000);

// ================================================================
// 第1部分: 设备状态监控（首页）
// ================================================================

function loadDeviceOverview() {
  apiGet('/api/devices/overview').then(function(result) {
    // 更新统计栏
    var stats = result.stats;
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statRunning').textContent = stats.running;
    document.getElementById('statWarning').textContent = stats.warning;
    document.getElementById('statError').textContent = stats.error;

    // 渲染设备卡片
    var grid = document.getElementById('deviceGrid');
    var statusLabel = { running: '正常', warning: '警告', error: '故障' };
    grid.innerHTML = result.devices.map(function(dev) {
      var sc = dev.status || 'running';
      var info = dev.alarm_info || '正常';
      var detail = dev.detail_info || '--';
      return '<div class="device-card ' + sc + ' clickable" onclick="showDeviceAlarm(\'' + dev.device_name + '\')" title="点击查看报警详情">'
        + '<div class="device-name">' + dev.device_name + '状态</div>'
        + '<div class="status-badge ' + sc + '">'
        +   '<span class="status-icon ' + sc + '"></span> ' + info
        + '</div>'
        + '<div class="device-detail">' + detail + '</div>'
        + '</div>';
    }).join('');
  }).catch(function(e) {
    console.error('加载设备概览失败:', e);
  });
}

function showDeviceAlarm(deviceName) {
  apiGet('/api/devices/alarm-log?name=' + encodeURIComponent(deviceName)).then(function(result) {
    var logs = result.logs || [];
    var title = document.getElementById('alarmDetailTitle');
    var subtitle = document.getElementById('alarmDetailSubtitle');
    var content = document.getElementById('alarmDetailContent');
    var panel = document.getElementById('alarmDetailPanel');

    title.textContent = result.device_name + ' 近期报警详情';
    subtitle.textContent = logs.length > 0 ? '以下为最近报警记录：' : '当前暂无最近报警信息。';

    if (logs.length > 0) {
      content.innerHTML = logs.map(function(item) {
        return '<div class="alarm-log-item">'
          + '<div class="alarm-log-time">' + (item.time || '--') + '</div>'
          + '<div class="alarm-log-message">' + (item.message || item.detail_info || '--') + '</div>'
          + '</div>';
      }).join('');
    } else {
      content.innerHTML = '<div class="alarm-log-empty">暂无报警记录。</div>';
    }

    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }).catch(function(e) {
    console.error('加载报警日志失败:', e);
  });
}

function closeAlarmPanel() {
  document.getElementById('alarmDetailPanel').style.display = 'none';
}

// ================================================================
// 第2部分: 热成像模块
// ================================================================

function loadThermalData() {
  apiGet('/api/thermal/latest').then(function(result) {
    var grid = document.getElementById('temperatureGrid');
    grid.innerHTML = (result.points || []).map(function(p) {
      var alarmClass = '';
      if (result.record && p.is_alarm) alarmClass = ' style="color:#ff4d4f;font-weight:700;"';
      return '<div class="temp-point">'
        + '<span class="point-name">' + p.point_name + '</span>'
        + '<span class="point-value"' + alarmClass + '>' + parseFloat(p.temperature).toFixed(1) + '℃</span>'
        + '</div>';
    }).join('');

    // 更新热成像图信息
    if (result.record) {
      document.getElementById('thermalInfo').textContent =
        '产品: ' + (result.record.product_name || '--')
        + ' | 最高: ' + (result.record.max_temp || '--') + '℃'
        + ' | 最低: ' + (result.record.min_temp || '--') + '℃'
        + ' | 平均: ' + (result.record.avg_temp || '--') + '℃';
    }
  }).catch(function(e) {
    console.error('加载热成像数据失败:', e);
  });
}

// ================================================================
// 第3部分: 模具配方模块
// ================================================================

function searchMoldRecipe() {
  var product = document.getElementById('recipeProduct').value.trim();
  var mold = document.getElementById('recipeMold').value.trim();
  var line = document.getElementById('recipeLine').value.trim();

  if (!product && !mold && !line) {
    document.getElementById('recipeResult').innerHTML = '<div class="recipe-empty">请输入至少一个搜索条件。</div>';
    return;
  }

  var params = [];
  if (product) params.push('product=' + encodeURIComponent(product));
  if (mold) params.push('mold=' + encodeURIComponent(mold));
  if (line) params.push('line=' + encodeURIComponent(line));

  apiGet('/api/recipes?' + params.join('&')).then(function(results) {
    var container = document.getElementById('recipeResult');
    if (results.length === 0) {
      container.innerHTML = '<div class="recipe-empty">未找到匹配的模具配方。</div>';
      return;
    }

    container.innerHTML = '<div class="recipe-list">'
      + results.map(function(item) {
        var settings = [
          '一快选择: ' + item.fast1_enabled,
          '一快位置: ' + item.fast1_position,
          '一快阀开度: ' + item.fast1_valve,
          '二快选择: ' + item.fast2_enabled,
          '二快位置: ' + item.fast2_position,
          '二快阀开度: ' + item.fast2_valve,
          '增压选择: ' + item.boost_enabled,
          '增压位置: ' + item.boost_position,
          '增压触发压力: ' + item.boost_pressure,
          '跟踪结束位置: ' + item.track_end_pos,
          '快储能压力: ' + item.fast_energy_pressure,
          '增储能压力: ' + item.boost_energy_pressure,
          '压射时间: ' + item.injection_time,
          '增压延时: ' + item.boost_delay,
          '冷却时间: ' + item.cooling_time,
          '回锤延时: ' + item.hammer_delay,
          '慢速流量: ' + item.slow_flow,
        ].join(' | ');
        return '<div class="recipe-card">'
          + '<div class="recipe-card-header">'
            + '<div class="recipe-card-title">' + item.product_name + '</div>'
            + '<div class="recipe-card-tag">' + (item.mold_name || '--') + '</div>'
          + '</div>'
          + '<div class="recipe-card-row"><span>产线</span><strong>' + (item.production_line || '--') + '</strong></div>'
          + '<div class="recipe-card-row recipe-settings">' + settings + '</div>'
        + '</div>';
      }).join('')
      + '</div>';
  }).catch(function(e) {
    console.error('搜索模具配方失败:', e);
  });
}

function resetMoldRecipeFilter() {
  document.getElementById('recipeProduct').value = '';
  document.getElementById('recipeMold').value = '';
  document.getElementById('recipeLine').value = '';
  document.getElementById('recipeResult').innerHTML = '<div class="recipe-empty">请输入搜索条件，查看匹配的模具配方。</div>';
}

// ================================================================
// 第4部分: 管路数据模块
// ================================================================

function loadPipelineData() {
  apiGet('/api/pipeline').then(function(params) {
    var tbody = document.getElementById('pipelineCurrentData');
    tbody.innerHTML = params.map(function(p) {
      return '<tr><td>' + p.param_name + '</td><td>' + p.param_value + '</td><td>' + p.param_unit + '</td></tr>';
    }).join('');
  }).catch(function(e) {
    console.error('加载管路数据失败:', e);
  });
}

function updatePipelineData() {
  var pressure = parseFloat(document.getElementById('pressureSet').value);
  var temp = parseFloat(document.getElementById('tempSet').value);
  var flow = parseFloat(document.getElementById('flowSet').value);
  var valve = parseInt(document.getElementById('valveOpen').value);

  if (isNaN(pressure) && isNaN(temp) && isNaN(flow) && isNaN(valve)) {
    alert('请至少输入一项有效数值！');
    return;
  }

  if (!isNaN(valve) && (valve < 0 || valve > 100)) {
    alert('阀门开度必须在0-100之间！');
    return;
  }

  apiPost('/api/pipeline/update', {
    pressure: isNaN(pressure) ? null : pressure,
    temperature: isNaN(temp) ? null : temp,
    flow: isNaN(flow) ? null : flow,
    valve: isNaN(valve) ? null : valve,
  }).then(function(result) {
    if (result.success) {
      loadPipelineData();
      document.getElementById('pipelineEditForm').reset();
      alert('参数已成功下发并更新！');
    } else {
      alert('更新失败: ' + (result.error || '未知错误'));
    }
  }).catch(function(e) {
    console.error('更新管路参数失败:', e);
    alert('更新失败，请检查服务是否启动。');
  });
}

// ================================================================
// 第5部分: 安灯呼叫系统
// ================================================================

var andonTypeMap = {};

function loadAndonData() {
  // 加载呼叫类型
  apiGet('/api/andon/types').then(function(types) {
    var grid = document.getElementById('andonGrid');
    var typeClassMap = {
      'quality': 'btn-type-quality', 'device': 'btn-type-device',
      'material': 'btn-type-material', 'safety': 'btn-type-safety',
      'mold': 'btn-type-tool', 'tooling': 'btn-type-other',
      'history': 'btn-type-other', 'login': 'btn-type-custom',
    };
    var iconMap = {
      'quality': '&#9888;', 'device': '&#128295;', 'material': '&#128230;',
      'safety': '&#128737;', 'mold': '&#127978;', 'tooling': '&#128296;',
      'history': '&#128196;', 'login': '&#128274;',
    };

    andonTypeMap = {};
    grid.innerHTML = types.map(function(t) {
      andonTypeMap[t.type_name] = t;
      return '<div class="andon-btn ' + (typeClassMap[t.type_key] || 'btn-type-other') + '" onclick="triggerCall(\'' + t.type_name + '\')">'
        + '<span class="btn-icon">' + (iconMap[t.type_key] || '&#9999;') + '</span>'
        + '<span class="btn-text">' + t.type_name + '呼叫</span>'
        + '</div>';
    }).join('');
  }).catch(function(e) {
    console.error('加载安灯类型失败:', e);
  });

  // 加载呼叫记录
  apiGet('/api/andon/calls').then(function(calls) {
    var tbody = document.getElementById('andonCallTableBody');
    var statusMap = {
      'pending': '<span class="record-status pending">&#9888; 待响应</span>',
      'processing': '<span class="record-status processing">&#9883; 处理中</span>',
      'completed': '<span class="record-status completed">&#10003; 已完成</span>',
      'cancelled': '<span class="record-status pending">&#10005; 已取消</span>',
    };
    tbody.innerHTML = calls.map(function(c, i) {
      return '<tr>'
        + '<td>' + (i + 1) + '</td>'
        + '<td>' + c.call_type + '</td>'
        + '<td>' + (c.call_detail || '--') + '</td>'
        + '<td>' + c.caller + '</td>'
        + '<td>' + c.call_time + '</td>'
        + '<td>' + (statusMap[c.status] || c.status) + '</td>'
        + '<td>' + (c.handler || '--') + '</td>'
        + '</tr>';
    }).join('');
  }).catch(function(e) {
    console.error('加载安灯记录失败:', e);
  });
}

function triggerCall(type) {
  var time = new Date().toLocaleString();
  apiPost('/api/andon/call', { call_type: type, call_detail: '', caller: '操作员' }).then(function(result) {
    if (result.success) {
      var message = '安灯呼叫，' + type + '。请相关人员立即响应。呼叫时间：' + time + '。';
      alert('已发起【' + type + '】呼叫请求！\n\n呼叫时间：' + time + '\n状态：等待响应...');
      speakCallMessage(message);
      loadAndonData(); // 刷新记录
    } else {
      alert('呼叫失败: ' + (result.error || '未知错误'));
    }
  }).catch(function(e) {
    console.error('发起呼叫失败:', e);
    var message = '安灯呼叫，' + type + '。请相关人员立即响应。呼叫时间：' + time + '。';
    alert('已发起【' + type + '】呼叫请求！\n\n呼叫时间：' + time + '\n（离线模式，未写入数据库）');
    speakCallMessage(message);
  });
}

function submitCustomCall() {
  var typeEl = document.getElementById('customCallType');
  var detailEl = document.getElementById('customCallDetail');
  var type = typeEl.value.trim();
  var detail = detailEl.value.trim();

  if (!type) { alert('请输入呼叫类型！'); typeEl.focus(); return; }
  if (!detail) { alert('请输入详细描述！'); detailEl.focus(); return; }

  var time = new Date().toLocaleString();
  apiPost('/api/andon/call', { call_type: type, call_detail: detail, caller: '操作员' }).then(function(result) {
    if (result.success) {
      var message = '安灯自定义呼叫，类型：' + type + '。详情：' + detail + '。请相关人员尽快处理。';
      alert('自定义呼叫已发起！\n\n类型：' + type + '\n详情：' + detail + '\n时间：' + time);
      speakCallMessage(message);
      typeEl.value = '';
      detailEl.value = '';
      loadAndonData();
    }
  }).catch(function(e) {
    console.error('发起自定义呼叫失败:', e);
    var message = '安灯自定义呼叫，类型：' + type + '。详情：' + detail + '。请相关人员尽快处理。';
    alert('自定义呼叫已发起！\n\n类型：' + type + '\n详情：' + detail + '\n（离线模式）');
    speakCallMessage(message);
    typeEl.value = '';
    detailEl.value = '';
  });
}

function speakCallMessage(message) {
  if (!('speechSynthesis' in window)) return;
  var utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'zh-CN';
  utterance.volume = 1;
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// ================================================================
// 第6部分: 工艺数据模块
// ================================================================

function loadProcessFilters() {
  apiGet('/api/process/filters').then(function(result) {
    var deviceSelect = document.getElementById('filterDevice');
    deviceSelect.innerHTML = '<option value="">全部设备</option>'
      + (result.devices || []).map(function(d) {
        return '<option value="' + d + '">' + d + '</option>';
      }).join('');

    var productSelect = document.getElementById('filterProduct');
    productSelect.innerHTML = '<option value="">全部型号</option>'
      + (result.products || []).map(function(p) {
        return '<option value="' + p + '">' + p + '</option>';
      }).join('');
  }).catch(function(e) {
    console.error('加载工艺筛选选项失败:', e);
  });
  // 默认加载数据
  searchProcessData();
}

function searchProcessData(page) {
  page = page || 1;
  var device = document.getElementById('filterDevice').value;
  var product = document.getElementById('filterProduct').value;
  var batch = document.getElementById('filterBatch').value;
  var startTime = document.getElementById('filterStartTime').value;
  var endTime = document.getElementById('filterEndTime').value;
  var status = document.getElementById('filterStatus').value;

  var params = ['page=' + page, 'pageSize=10'];
  if (device) params.push('device=' + encodeURIComponent(device));
  if (product) params.push('product=' + encodeURIComponent(product));
  if (batch) params.push('batch=' + encodeURIComponent(batch));
  if (startTime) params.push('startTime=' + encodeURIComponent(startTime));
  if (endTime) params.push('endTime=' + encodeURIComponent(endTime));
  if (status) params.push('status=' + encodeURIComponent(status));

  apiGet('/api/process/data?' + params.join('&')).then(function(result) {
    // 更新记录数
    document.getElementById('processRecordCount').textContent = result.total;

    // 渲染表格
    var tbody = document.getElementById('processTableBody');
    if (result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:var(--text-secondary);padding:30px;">暂无数据</td></tr>';
    } else {
      var statusHtml = {
        'normal': '<span style="color:#52c41a;font-weight:600;">&#10003; 正常</span>',
        'warning': '<span style="color:#faad14;font-weight:600;">&#9888; 预警</span>',
        'abnormal': '<span style="color:#ff4d4f;font-weight:600;">&#10007; 异常</span>',
      };
      tbody.innerHTML = result.data.map(function(d, i) {
        return '<tr>'
          + '<td>' + ((page - 1) * 10 + i + 1) + '</td>'
          + '<td>' + d.collect_time + '</td>'
          + '<td>' + d.device_code + '</td>'
          + '<td>' + d.product_model + '</td>'
          + '<td>' + d.batch_no + '</td>'
          + '<td>' + (d.slow_speed != null ? d.slow_speed : '--') + '</td>'
          + '<td>' + (d.fast_speed != null ? d.fast_speed : '--') + '</td>'
          + '<td>' + (d.cast_pressure != null ? d.cast_pressure : '--') + '</td>'
          + '<td>' + (d.boost_pressure != null ? d.boost_pressure : '--') + '</td>'
          + '<td>' + (d.pour_temp != null ? d.pour_temp : '--') + '</td>'
          + '<td>' + (d.mold_temp != null ? d.mold_temp : '--') + '</td>'
          + '<td>' + (d.cycle_time != null ? d.cycle_time : '--') + '</td>'
          + '<td>' + (d.hold_time != null ? d.hold_time : '--') + '</td>'
          + '<td>' + (statusHtml[d.data_status] || d.data_status) + '</td>'
          + '</tr>';
      }).join('');
    }

    // 更新分页
    renderPagination('processPagination', result.total, page, 10, 'searchProcessData');

    // 更新筛选设备下拉
    loadProcessFilters();
  }).catch(function(e) {
    console.error('查询工艺数据失败:', e);
  });
}

function resetProcessFilter() {
  document.getElementById('filterDevice').value = '';
  document.getElementById('filterProduct').value = '';
  document.getElementById('filterBatch').value = '';
  document.getElementById('filterStartTime').value = '';
  document.getElementById('filterEndTime').value = '';
  document.getElementById('filterStatus').value = '';
  searchProcessData(1);
}

// ================================================================
// 第7部分: 历史工件数据分析模块
// ================================================================

function loadAnalysisData(page) {
  page = page || 1;
  var keyword = document.getElementById('searchWorkpiece').value;
  var device = document.getElementById('compareDevice').value;

  var params = ['page=' + page, 'pageSize=8'];
  if (keyword) params.push('keyword=' + encodeURIComponent(keyword));
  if (device) params.push('device=' + encodeURIComponent(device));

  apiGet('/api/analysis/data?' + params.join('&')).then(function(result) {
    // 渲染标准参数面板
    var standardsBody = document.getElementById('standardsBody');
    standardsBody.innerHTML = (result.standards || []).map(function(s) {
      return '<div class="standard-item">'
        + '<div>'
          + '<div class="std-label">' + s.param_name + ' (' + (s.unit || '') + ')</div>'
          + '<div class="std-range">标准值 &plusmn; 允许误差</div>'
        + '</div>'
        + '<div><div class="std-value">' + s.standard_value + ' &plusmn; ' + s.tolerance + '</div></div>'
        + '</div>';
    }).join('');

    // 构建标准参数映射
    var stdMap = {};
    (result.standards || []).forEach(function(s) {
      stdMap[s.param_key] = { standard: s.standard_value, tolerance: s.tolerance };
    });

    // 渲染对比数据表格
    var tbody = document.getElementById('compareTableBody');
    if (result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--text-secondary);padding:30px;">暂无数据</td></tr>';
    } else {
      var judgeHtml = {
        'qualified': '<span style="color:#52c41a;font-weight:600;">&#10003; 合格</span>',
        'warning': '<span style="color:#faad14;font-weight:600;">&#9888; 预警</span>',
        'unqualified': '<span style="color:#ff4d4f;font-weight:600;">&#10007; 不合格</span>',
      };
      tbody.innerHTML = result.data.map(function(d, i) {
        var fields = [
          { key: 'slow_speed', label: '慢压射' },
          { key: 'fast_speed', label: '快压射' },
          { key: 'cast_pressure', label: '铸造压力' },
          { key: 'boost_pressure', label: '增压压力' },
          { key: 'pour_temp', label: '浇注温度' },
          { key: 'mold_temp', label: '模具温度' },
          { key: 'cycle_time', label: '循环周期' },
          { key: 'hold_time', label: '保压时间' },
        ];

        var cells = fields.map(function(f) {
          var val = d[f.key];
          var std = stdMap[f.key];
          if (val == null || !std) return '<td>--</td>';

          var diff = val - std.standard;
          var diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(2);
          var absDiff = Math.abs(diff);

          if (absDiff > std.tolerance) {
            return '<td class="cell-out-of-range">' + val + '<span class="diff-value" style="color:#ff787e;">' + diffStr + ' &#10007;</span></td>';
          } else if (absDiff > std.tolerance * 0.8) {
            return '<td class="cell-warning">' + val + '<span class="diff-value" style="color:#faad14;">' + diffStr + '</span></td>';
          } else {
            return '<td class="cell-in-range">' + val + '<span class="diff-value">' + diffStr + '</span></td>';
          }
        });

        return '<tr>'
          + '<td>' + ((page - 1) * 8 + i + 1) + '</td>'
          + '<td>' + d.workpiece_no + '</td>'
          + '<td>' + d.collect_time + '</td>'
          + '<td>' + d.device_code + '</td>'
          + cells.join('')
          + '<td>' + (judgeHtml[d.judge_result] || d.judge_result) + '</td>'
          + '</tr>';
      }).join('');
    }

    // 更新分页
    renderPagination('analysisPagination', result.total, page, 8, 'loadAnalysisData');
    document.getElementById('analysisPaginationInfo').textContent =
      '显示 ' + ((page - 1) * 8 + 1) + '-' + Math.min(page * 8, result.total) + ' / 共 ' + result.total + ' 条记录 | 不合格率: ' + result.unqualifiedRate + '%';

    // 更新筛选设备下拉
    apiGet('/api/analysis/filters').then(function(f) {
      var sel = document.getElementById('compareDevice');
      sel.innerHTML = '<option value="">全部设备</option>'
        + (f.devices || []).map(function(d) { return '<option value="' + d + '">' + d + '</option>'; }).join('');
    });
  }).catch(function(e) {
    console.error('加载分析数据失败:', e);
  });
}

function searchCompareData() {
  loadAnalysisData(1);
}

// ================================================================
// 通用分页组件
// ================================================================

function renderPagination(containerId, total, currentPage, pageSize, callbackName) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  var html = '';
  html += '<button class="page-btn" onclick="' + callbackName + '(' + Math.max(1, currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>&laquo;</button>';

  var startPage = Math.max(1, currentPage - 2);
  var endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    html += '<button class="page-btn" onclick="' + callbackName + '(1)">1</button>';
    if (startPage > 2) html += '<button class="page-btn" disabled>...</button>';
  }

  for (var p = startPage; p <= endPage; p++) {
    html += '<button class="page-btn' + (p === currentPage ? ' active' : '') + '" onclick="' + callbackName + '(' + p + ')">' + p + '</button>';
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += '<button class="page-btn" disabled>...</button>';
    html += '<button class="page-btn" onclick="' + callbackName + '(' + totalPages + ')">' + totalPages + '</button>';
  }

  html += '<button class="page-btn" onclick="' + callbackName + '(' + Math.min(totalPages, currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>&raquo;</button>';

  container.innerHTML = html;
}

// ================================================================
// 页面初始化: 加载首页数据
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
  loadDeviceOverview();
});
