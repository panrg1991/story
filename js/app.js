// ========== 页面切换 ==========
document.querySelectorAll('.nav-link').forEach(function(link) {
  link.addEventListener('click', function() {
    var page = this.getAttribute('data-page');
    
    // 切换导航高亮
    document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
    this.classList.add('active');
    
    // 切换页面
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById(page).classList.add('active');
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

var deviceAlarmLogs = {
  '红外钳机': [
    { time: '2026-05-13 10:22:30', message: '缺料报警：物料供应中断，生产线暂停。' },
    { time: '2026-05-13 09:50:12', message: '定位传感器异常，建议检查送料机构。' }
  ],
  '压铸机': [
    { time: '2026-05-13 11:05:50', message: '冷却回路水压波动，已切换备用系统。' },
    { time: '2026-05-13 08:36:40', message: '模具温度超限，自动报警提醒。' }
  ],
  '真空机': [
    { time: '2026-05-13 10:58:18', message: '真空泵抽气效率下降，需检查泵油。' },
    { time: '2026-05-13 10:12:05', message: '非空压力异常，已触发安全停机。' }
  ],
  '喷雾机': [
    { time: '2026-05-13 09:43:28', message: '喷涂模块异常：喷嘴堵塞，需清理。' },
    { time: '2026-05-13 08:55:03', message: '喷雾压力偏低，已降低生产节奏。' }
  ],
  '抽芯机': [
    { time: '2026-05-13 09:30:12', message: '抽芯机构故障停机，等待维修人员到场。' },
    { time: '2026-05-13 07:58:40', message: '油压不足，建议检查液压系统。' }
  ],
  '求温机': [
    { time: '2026-05-13 10:02:54', message: '温控回路异常：温度上升过快。' },
    { time: '2026-05-13 08:22:10', message: '过载停机，已报警通知现场维护。' }
  ],
  '取件机': [
    { time: '2026-05-13 10:18:05', message: '正常异响：传动轴需检查并加注润滑脂。' },
    { time: '2026-05-13 09:01:22', message: '传感器信号不稳定，建议巡检。' }
  ],
  '点冷机': [
    { time: '2026-05-13 09:50:55', message: '点冷机温度正常，但冷却泵振动增大。' },
    { time: '2026-05-13 08:15:43', message: '水冷系统流量偏低，已调整泵速。' }
  ]
};

function showDeviceAlarm(deviceName) {
  var logs = deviceAlarmLogs[deviceName] || [];
  var title = document.getElementById('alarmDetailTitle');
  var subtitle = document.getElementById('alarmDetailSubtitle');
  var content = document.getElementById('alarmDetailContent');
  var panel = document.getElementById('alarmDetailPanel');

  title.textContent = deviceName + ' 近期报警详情';
  subtitle.textContent = logs.length > 0 ? '以下为最近报警记录：' : '当前暂无最近报警信息。';

  if (logs.length > 0) {
    content.innerHTML = logs.map(function(item) {
      return '<div class="alarm-log-item">'
        + '<div class="alarm-log-time">' + item.time + '</div>'
        + '<div class="alarm-log-message">' + item.message + '</div>'
        + '</div>';
    }).join('');
  } else {
    content.innerHTML = '<div class="alarm-log-empty">暂无报警记录，请稍后再试。</div>';
  }

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeAlarmPanel() {
  document.getElementById('alarmDetailPanel').style.display = 'none';
}

// ========== 安灯呼叫功能 ==========
function speakCallMessage(message) {
  if (!('speechSynthesis' in window)) {
    console.warn('浏览器不支持 SpeechSynthesis，无法进行音箱播报。');
    return;
  }

  var utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'zh-CN';
  utterance.volume = 1;
  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function triggerCall(type) {
  var time = new Date().toLocaleString();
  var message = '安灯呼叫，' + type + '。请相关人员立即响应。呼叫时间：' + time + '。';
  alert('已发起【' + type + '】呼叫请求！\n\n呼叫时间：' + time + '\n状态：等待响应...');
  speakCallMessage(message);
}

function submitCustomCall() {
  var typeEl = document.getElementById('customCallType');
  var detailEl = document.getElementById('customCallDetail');
  var type = typeEl.value.trim();
  var detail = detailEl.value.trim();
  
  if (!type) {
    alert('请输入呼叫类型！');
    typeEl.focus();
    return;
  }
  if (!detail) {
    alert('请输入详细描述！');
    detailEl.focus();
    return;
  }
  
  var time = new Date().toLocaleString();
  var message = '安灯自定义呼叫，类型：' + type + '。详情：' + detail + '。请相关人员尽快处理。呼叫时间：' + time + '。';
  alert('自定义呼叫已发起！\n\n类型：' + type + '\n详情：' + detail + '\n时间：' + time);
  speakCallMessage(message);
  typeEl.value = '';
  detailEl.value = '';
}

var moldRecipeData = [
  {
    product: 'P3500T',
    mold: '模具A',
    line: '产线1',
    settings: '浇注温度: 680℃, 模具温度: 245℃, 慢压射速度: 0.18m/s, 快压射速度: 2.85m/s'
  },
  {
    product: 'P5000T',
    mold: '模具B',
    line: '产线2',
    settings: '浇注温度: 700℃, 模具温度: 250℃, 慢压射速度: 0.20m/s, 快压射速度: 3.10m/s'
  },
  {
    product: 'P2600T',
    mold: '模具C',
    line: '产线1',
    settings: '浇注温度: 660℃, 模具温度: 238℃, 慢压射速度: 0.16m/s, 快压射速度: 2.72m/s'
  },
  {
    product: 'P3500T',
    mold: '模具D',
    line: '产线3',
    settings: '浇注温度: 690℃, 模具温度: 248℃, 慢压射速度: 0.19m/s, 快压射速度: 2.90m/s'
  }
];

function searchMoldRecipe() {
  var product = document.getElementById('recipeProduct').value.trim();
  var mold = document.getElementById('recipeMold').value.trim();
  var line = document.getElementById('recipeLine').value.trim();
  var result = moldRecipeData.filter(function(item) {
    return (!product || item.product.indexOf(product) !== -1)
      && (!mold || item.mold.indexOf(mold) !== -1)
      && (!line || item.line.indexOf(line) !== -1);
  });

  var container = document.getElementById('recipeResult');
  if (!product && !mold && !line) {
    container.innerHTML = '<div class="recipe-empty">请输入至少一个搜索条件。</div>';
    return;
  }

  if (result.length === 0) {
    container.innerHTML = '<div class="recipe-empty">未找到匹配的模具配方。</div>';
    return;
  }

  container.innerHTML = '<div class="recipe-list">'
    + result.map(function(item) {
      return '<div class="recipe-card">'
        + '<div class="recipe-card-header">'
          + '<div class="recipe-card-title">' + item.product + '</div>'
          + '<div class="recipe-card-tag">' + item.mold + '</div>'
        + '</div>'
        + '<div class="recipe-card-row"><span>产线</span><strong>' + item.line + '</strong></div>'
        + '<div class="recipe-card-row recipe-settings">' + item.settings + '</div>'
      + '</div>';
    }).join('')
    + '</div>';
}

function resetMoldRecipeFilter() {
  document.getElementById('recipeProduct').value = '';
  document.getElementById('recipeMold').value = '';
  document.getElementById('recipeLine').value = '';
  document.getElementById('recipeResult').innerHTML = '<div class="recipe-empty">请输入搜索条件，查看匹配的模具配方。</div>';
}

// ========== 工艺数据查询 ==========
function searchProcessData() {
  var device = document.getElementById('filterDevice').value;
  var product = document.getElementById('filterProduct').value;
  var batch = document.getElementById('filterBatch').value;
  var startTime = document.getElementById('filterStartTime').value;
  var endTime = document.getElementById('filterEndTime').value;
  var status = document.getElementById('filterStatus').value;
  
  var msg = '查询条件：\n';
  if (device) msg += '设备编号: ' + device + '\n';
  if (product) msg += '产品型号: ' + product + '\n';
  if (batch) msg += '批次号: ' + batch + '\n';
  if (startTime) msg += '开始时间: ' + startTime + '\n';
  if (endTime) msg += '结束时间: ' + endTime + '\n';
  if (status) msg += '数据状态: ' + status + '\n';
  
  if (!device && !product && !batch && !startTime && !endTime && !status) {
    alert('查询完成！显示全部数据（模拟）');
  } else {
    alert(msg + '\n查询完成！（模拟数据演示）');
  }
}

function resetProcessFilter() {
  document.getElementById('filterDevice').value = '';
  document.getElementById('filterProduct').value = '';
  document.getElementById('filterBatch').value = '';
  document.getElementById('filterStartTime').value = '';
  document.getElementById('filterEndTime').value = '';
  document.getElementById('filterStatus').value = '';
}

// ========== 历史数据分析查询 ==========
function searchCompareData() {
  var keyword = document.getElementById('searchWorkpiece').value;
  var device = document.getElementById('compareDevice').value;
  
  if (!keyword && !device) {
    alert('请输入搜索关键词或选择设备！');
    return;
  }
  
  alert('对比分析查询中...\n\n工件编号/批号: ' + (keyword || '--') + '\n设备: ' + (device || '--') + '\n\n（模拟查询结果）');
}

// ========== 管路数据管理 ==========
var pipelineCurrentData = {
  pressure: 5.0, // MPa
  temperature: 25.0, // ℃
  flow: 10.0, // L/min
  valve: 50 // %
};

function initPipelineData() {
  var tbody = document.getElementById('pipelineCurrentData');
  tbody.innerHTML = '';
  for (var key in pipelineCurrentData) {
    var row = document.createElement('tr');
    var name = '';
    var unit = '';
    switch (key) {
      case 'pressure': name = '压力设定'; unit = 'MPa'; break;
      case 'temperature': name = '温度设定'; unit = '℃'; break;
      case 'flow': name = '流量设定'; unit = 'L/min'; break;
      case 'valve': name = '阀门开度'; unit = '%'; break;
    }
    row.innerHTML = '<td>' + name + '</td><td>' + pipelineCurrentData[key] + '</td><td>' + unit + '</td>';
    tbody.appendChild(row);
  }
}

function updatePipelineData() {
  var pressure = parseFloat(document.getElementById('pressureSet').value);
  var temp = parseFloat(document.getElementById('tempSet').value);
  var flow = parseFloat(document.getElementById('flowSet').value);
  var valve = parseInt(document.getElementById('valveOpen').value);

  if (isNaN(pressure) || isNaN(temp) || isNaN(flow) || isNaN(valve)) {
    alert('请输入有效的数值！');
    return;
  }

  if (valve < 0 || valve > 100) {
    alert('阀门开度必须在0-100之间！');
    return;
  }

  // 更新数据
  pipelineCurrentData.pressure = pressure;
  pipelineCurrentData.temperature = temp;
  pipelineCurrentData.flow = flow;
  pipelineCurrentData.valve = valve;

  // 重新渲染表格
  initPipelineData();

  // 清空表单
  document.getElementById('pipelineEditForm').reset();

  alert('参数已成功下发并更新！');
}

// 页面切换时初始化管路数据
document.querySelectorAll('.nav-link').forEach(function(link) {
  link.addEventListener('click', function() {
    var page = this.getAttribute('data-page');
    
    // 切换导航高亮
    document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
    this.classList.add('active');
    
    // 切换页面
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById(page).classList.add('active');

    // 初始化管路数据
    if (page === 'pipeline') {
      initPipelineData();
    }
  });
});
