-- ============================================================
-- MES设备监控系统 - 完整数据库初始化脚本 (All-in-One)
-- 数据库文件: mesmonitor.db
-- 运行方式: sqlite3 mesmonitor.db < init_all.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 第1部分: 设备监控模块
-- ============================================================

-- 1.1 设备信息表
CREATE TABLE IF NOT EXISTS devices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    device_name     TEXT    NOT NULL UNIQUE,
    device_type     TEXT    NOT NULL,
    device_code     TEXT    UNIQUE,
    location        TEXT,
    model           TEXT,
    manufacturer    TEXT,
    install_date    TEXT,
    description     TEXT,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    updated_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 1.2 设备实时状态表
CREATE TABLE IF NOT EXISTS device_status (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id       INTEGER NOT NULL,
    status          TEXT    NOT NULL,              -- running/warning/error
    alarm_info      TEXT,
    detail_info     TEXT,
    updated_at      TEXT    DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- 1.3 历史状态记录表
CREATE TABLE IF NOT EXISTS device_status_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id       INTEGER NOT NULL,
    status          TEXT    NOT NULL,
    alarm_info      TEXT,
    detail_info     TEXT,
    start_time      TEXT    NOT NULL,
    end_time        TEXT,
    duration_seconds INTEGER,
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- 设备监控索引
CREATE INDEX IF NOT EXISTS idx_device_status_device_id ON device_status(device_id);
CREATE INDEX IF NOT EXISTS idx_device_status_status    ON device_status(status);
CREATE INDEX IF NOT EXISTS idx_history_device_id       ON device_status_history(device_id);
CREATE INDEX IF NOT EXISTS idx_history_status          ON device_status_history(status);
CREATE INDEX IF NOT EXISTS idx_history_start_time      ON device_status_history(start_time);
CREATE INDEX IF NOT EXISTS idx_history_end_time        ON device_status_history(end_time);


-- ============================================================
-- 第2部分: 热成像模块
-- ============================================================

-- 2.1 产品表
CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name    TEXT    NOT NULL,
    product_code    TEXT    UNIQUE,
    product_type    TEXT,
    description     TEXT,
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    updated_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 2.2 热成像记录表
CREATE TABLE IF NOT EXISTS thermal_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL,
    record_time     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    image_path      TEXT,
    image_base64    TEXT,
    image_format    TEXT    DEFAULT 'svg',
    max_temp        REAL,
    min_temp        REAL,
    avg_temp        REAL,
    alarm_status    TEXT    DEFAULT 'normal',
    alarm_msg       TEXT,
    remark          TEXT,
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 2.3 热成像点位温度表
CREATE TABLE IF NOT EXISTS thermal_point_temps (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id       INTEGER NOT NULL,
    point_name      TEXT    NOT NULL,
    point_index     INTEGER NOT NULL,
    temperature     REAL    NOT NULL,
    pos_x           REAL,
    pos_y           REAL,
    is_alarm        INTEGER DEFAULT 0,
    alarm_threshold REAL,
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (record_id) REFERENCES thermal_records(id) ON DELETE CASCADE
);

-- 2.4 热成像报警阈值配置表
CREATE TABLE IF NOT EXISTS thermal_alarm_config (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    point_index     INTEGER NOT NULL UNIQUE,
    point_name      TEXT    NOT NULL,
    temp_high       REAL    DEFAULT 80.0,
    temp_low        REAL    DEFAULT 0.0,
    is_enabled      INTEGER DEFAULT 1,
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    updated_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 热成像索引
CREATE INDEX IF NOT EXISTS idx_thermal_product_id   ON thermal_records(product_id);
CREATE INDEX IF NOT EXISTS idx_thermal_record_time  ON thermal_records(record_time);
CREATE INDEX IF NOT EXISTS idx_thermal_point_record ON thermal_point_temps(record_id);
CREATE INDEX IF NOT EXISTS idx_thermal_point_index  ON thermal_point_temps(record_id, point_index);


-- ============================================================
-- 第3部分: 模具配方模块
-- ============================================================

-- 3.1 模具信息表
CREATE TABLE IF NOT EXISTS molds (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    mold_name       TEXT    NOT NULL,                    -- 模具名称
    mold_code       TEXT    UNIQUE,                      -- 模具编码
    mold_type       TEXT,                                -- 模具类型
    description     TEXT,                                -- 描述
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    updated_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 3.2 模具配方主表 (关联产品、模具、产线)
CREATE TABLE IF NOT EXISTS mold_recipes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name    TEXT    NOT NULL,                    -- 产品名称
    mold_id         INTEGER,                             -- 关联模具ID
    production_line TEXT,                                -- 产线
    -- 一快参数
    fast1_enabled   TEXT    DEFAULT '否',                 -- 一快选择
    fast1_position  REAL    DEFAULT 0,                   -- 一快设定位置
    fast1_valve     REAL    DEFAULT 0,                   -- 一快油阀开度
    -- 二快参数
    fast2_enabled   TEXT    DEFAULT '否',                 -- 二快选择
    fast2_position  REAL    DEFAULT 0,                   -- 二快设定位置
    fast2_valve     REAL    DEFAULT 0,                   -- 二快油阀开度
    -- 增压参数
    boost_enabled   TEXT    DEFAULT '0',                  -- 增压选择
    boost_position  REAL    DEFAULT 0,                   -- 增压设定位置
    boost_pressure  REAL    DEFAULT 0,                   -- 增压触发压力
    -- 其他参数
    track_end_pos   REAL    DEFAULT 0,                   -- 跟踪结束位置
    fast_energy_pressure REAL DEFAULT 0,                 -- 快速储能压力
    boost_energy_pressure REAL DEFAULT 0,                -- 增压储能压力
    injection_time  REAL    DEFAULT 0,                   -- 压射时间
    boost_delay     REAL    DEFAULT 0,                   -- 增压延时
    cooling_time    REAL    DEFAULT 0,                   -- 冷却时间
    hammer_delay    REAL    DEFAULT 0,                   -- 回锤延时
    slow_flow       REAL    DEFAULT 0,                   -- 慢速系统流量
    remark          TEXT,                                -- 备注
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    updated_at      TEXT    DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (mold_id) REFERENCES molds(id) ON DELETE SET NULL
);

-- 模具配方索引
CREATE INDEX IF NOT EXISTS idx_recipe_product ON mold_recipes(product_name);
CREATE INDEX IF NOT EXISTS idx_recipe_mold    ON mold_recipes(mold_id);
CREATE INDEX IF NOT EXISTS idx_recipe_line    ON mold_recipes(production_line);


-- ============================================================
-- 第4部分: 管路数据模块
-- ============================================================

-- 4.1 管路配方参数表 (当前值)
CREATE TABLE IF NOT EXISTS pipeline_params (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    param_name      TEXT    NOT NULL UNIQUE,              -- 参数名称 (压力设定/温度设定/流量设定/阀门开度)
    param_value     REAL    NOT NULL DEFAULT 0,           -- 当前值
    param_unit      TEXT    NOT NULL,                     -- 单位 (MPa/℃/m³/h/%)
    min_value       REAL,                                 -- 最小值
    max_value       REAL,                                 -- 最大值
    updated_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 4.2 管路参数下发记录表
CREATE TABLE IF NOT EXISTS pipeline_edit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    param_name      TEXT    NOT NULL,                     -- 参数名称
    old_value       REAL    NOT NULL,                     -- 修改前值
    new_value       REAL    NOT NULL,                     -- 修改后值
    operator        TEXT    DEFAULT '系统',                -- 操作人
    edit_time       TEXT    DEFAULT (datetime('now','localtime')), -- 操作时间
    remark          TEXT                                  -- 备注
);

-- 管路数据索引
CREATE INDEX IF NOT EXISTS idx_pipeline_edit_time ON pipeline_edit_log(edit_time);


-- ============================================================
-- 第5部分: 安灯呼叫系统模块
-- ============================================================

-- 5.1 安灯呼叫记录表
CREATE TABLE IF NOT EXISTS andon_calls (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    call_type       TEXT    NOT NULL,                     -- 呼叫类型: 质量异常/设备故障/物料短缺/安全告警/模具异常/工装辅助/自定义
    call_detail     TEXT,                                 -- 详细描述
    caller          TEXT    NOT NULL DEFAULT '系统自动',   -- 呼叫人
    call_time       TEXT    NOT NULL DEFAULT (datetime('now','localtime')), -- 呼叫时间
    status          TEXT    NOT NULL DEFAULT 'pending',    -- 状态: pending(待响应)/processing(处理中)/completed(已完成)/cancelled(已取消)
    handler         TEXT,                                 -- 处理人
    handle_time     TEXT,                                 -- 处理时间
    handle_remark   TEXT,                                 -- 处理备注
    created_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 5.2 呼叫类型配置表 (预设8种快捷呼叫)
CREATE TABLE IF NOT EXISTS andon_call_types (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name       TEXT    NOT NULL UNIQUE,              -- 类型名称
    type_key        TEXT    NOT NULL UNIQUE,              -- 类型Key (英文标识)
    type_icon       TEXT,                                 -- 图标
    sort_order      INTEGER DEFAULT 0,                    -- 排序
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 安灯索引
CREATE INDEX IF NOT EXISTS idx_andon_call_type   ON andon_calls(call_type);
CREATE INDEX IF NOT EXISTS idx_andon_status      ON andon_calls(status);
CREATE INDEX IF NOT EXISTS idx_andon_call_time   ON andon_calls(call_time);


-- ============================================================
-- 第6部分: 工艺数据采集模块
-- ============================================================

-- 6.1 工艺数据采集表 (对应页面数据表格)
CREATE TABLE IF NOT EXISTS process_data (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    collect_time    TEXT    NOT NULL,                     -- 采集时间
    device_code     TEXT    NOT NULL,                     -- 设备编号 (YZJ-001等)
    product_model   TEXT    NOT NULL,                     -- 产品型号 (P3500T等)
    batch_no        TEXT    NOT NULL,                     -- 批次号
    slow_speed      REAL,                                 -- 慢压射速度 (m/s)
    fast_speed      REAL,                                 -- 快压射速度 (m/s)
    cast_pressure   REAL,                                 -- 铸造压力 (MPa)
    boost_pressure  REAL,                                 -- 增压压力 (MPa)
    pour_temp       REAL,                                 -- 浇注温度 (℃)
    mold_temp       REAL,                                 -- 模具温度 (℃)
    cycle_time      REAL,                                 -- 循环周期 (s)
    hold_time       REAL,                                 -- 保压时间 (s)
    data_status     TEXT    DEFAULT 'normal',             -- 数据状态: normal(正常)/warning(预警)/abnormal(异常)
    remark          TEXT,                                 -- 备注
    created_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 6.2 标准工艺参数表 (工艺标准值，用于对比判定)
CREATE TABLE IF NOT EXISTS process_standards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_model   TEXT    NOT NULL,                     -- 产品型号
    param_name      TEXT    NOT NULL,                     -- 参数名称
    param_key       TEXT    NOT NULL,                     -- 参数字段名 (如: slow_speed)
    standard_value  REAL    NOT NULL,                     -- 标准值
    tolerance       REAL    NOT NULL,                     -- 允许误差 (±)
    unit            TEXT,                                 -- 单位
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    updated_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 工艺数据索引
CREATE INDEX IF NOT EXISTS idx_process_collect_time ON process_data(collect_time);
CREATE INDEX IF NOT EXISTS idx_process_device_code  ON process_data(device_code);
CREATE INDEX IF NOT EXISTS idx_process_product      ON process_data(product_model);
CREATE INDEX IF NOT EXISTS idx_process_batch        ON process_data(batch_no);
CREATE INDEX IF NOT EXISTS idx_process_status       ON process_data(data_status);
CREATE INDEX IF NOT EXISTS idx_standard_model       ON process_standards(product_model);


-- ============================================================
-- 第7部分: 历史工件数据分析模块
-- ============================================================

-- 7.1 工件分析数据表 (对应对比分析表格)
CREATE TABLE IF NOT EXISTS workpiece_analysis (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    workpiece_no    TEXT    NOT NULL UNIQUE,              -- 工件编号 (WJ202605130001)
    collect_time    TEXT    NOT NULL,                     -- 采集时间
    device_code     TEXT    NOT NULL,                     -- 设备编号
    product_model   TEXT    NOT NULL,                     -- 产品型号
    batch_no        TEXT,                                 -- 批次号
    slow_speed      REAL,                                 -- 慢压射速度 (m/s)
    fast_speed      REAL,                                 -- 快压射速度 (m/s)
    cast_pressure   REAL,                                 -- 铸造压力 (MPa)
    boost_pressure  REAL,                                 -- 增压压力 (MPa)
    pour_temp       REAL,                                 -- 浇注温度 (℃)
    mold_temp       REAL,                                 -- 模具温度 (℃)
    cycle_time      REAL,                                 -- 循环周期 (s)
    hold_time       REAL,                                 -- 保压时间 (s)
    judge_result    TEXT    DEFAULT 'qualified',          -- 判定结果: qualified(合格)/warning(预警)/unqualified(不合格)
    judge_detail    TEXT,                                 -- 判定详情 (哪些参数超标)
    created_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 7.2 分析标准参数表 (对应标准工艺参数面板)
CREATE TABLE IF NOT EXISTS analysis_standards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    param_name      TEXT    NOT NULL,                     -- 参数名称
    param_key       TEXT    NOT NULL UNIQUE,              -- 参数字段名
    standard_value  REAL    NOT NULL,                     -- 标准值
    tolerance       REAL    NOT NULL,                     -- 允许误差 (±)
    unit            TEXT,                                 -- 单位
    display_order   INTEGER DEFAULT 0,                    -- 显示顺序
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT    DEFAULT (datetime('now','localtime')),
    updated_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- 工件分析索引
CREATE INDEX IF NOT EXISTS idx_workpiece_no         ON workpiece_analysis(workpiece_no);
CREATE INDEX IF NOT EXISTS idx_workpiece_device     ON workpiece_analysis(device_code);
CREATE INDEX IF NOT EXISTS idx_workpiece_time       ON workpiece_analysis(collect_time);
CREATE INDEX IF NOT EXISTS idx_workpiece_result     ON workpiece_analysis(judge_result);
CREATE INDEX IF NOT EXISTS idx_workpiece_product    ON workpiece_analysis(product_model);


-- ============================================================
-- ==================== 初始化数据 ============================
-- ============================================================

-- ----- 设备基础数据 (8台设备) -----
INSERT OR IGNORE INTO devices (device_name, device_type, device_code, location) VALUES
    ('红外钳机', '钳机',     'DEV-001', '压铸车间'),
    ('压铸机',   '压铸机',   'DEV-002', '压铸车间'),
    ('真空机',   '真空机',   'DEV-003', '压铸车间'),
    ('喷雾机',   '喷雾机',   'DEV-004', '压铸车间'),
    ('抽芯机',   '抽芯机',   'DEV-005', '压铸车间'),
    ('求温机',   '温控设备', 'DEV-006', '压铸车间'),
    ('取件机',   '取件机',   'DEV-007', '压铸车间'),
    ('点冷机',   '冷却设备', 'DEV-008', '压铸车间');

-- ----- 设备当前状态数据 -----
INSERT OR REPLACE INTO device_status (device_id, status, alarm_info, detail_info)
SELECT d.id, s.status, s.alarm_info, s.detail_info
FROM devices d
JOIN (
    SELECT '红外钳机' AS name, 'error' AS status,   '缺料报警'     AS alarm_info, '权监超时配区'         AS detail_info UNION ALL
    SELECT '压铸机',          'running',            '正常'         , '--'                             UNION ALL
    SELECT '真空机',          'warning',            '非空压力异常' , 'D灯归压力异常'                  UNION ALL
    SELECT '喷雾机',          'error',              '喷涂模块异常' , '喷涂模块异常'                   UNION ALL
    SELECT '抽芯机',          'error',              '故障停机'     , 'C602单元常状状态异常'           UNION ALL
    SELECT '求温机',          'error',              '过载停机'     , 'C602过温异常'                   UNION ALL
    SELECT '取件机',          'warning',            '正常异响'     , 'xx通道异常'                     UNION ALL
    SELECT '点冷机',          'running',            '正常开机'     , 'xx温度正常'
) s ON d.device_name = s.name;

-- ----- 设备状态历史记录 -----
INSERT OR IGNORE INTO device_status_history (device_id, status, alarm_info, detail_info, start_time)
SELECT d.id, s.status, s.alarm_info, s.detail_info, datetime('now','localtime')
FROM devices d
JOIN (
    SELECT '红外钳机' AS name, 'error' AS status,   '缺料报警'     AS alarm_info, '权监超时配区'         AS detail_info UNION ALL
    SELECT '压铸机',          'running',            '正常'         , '--'                             UNION ALL
    SELECT '真空机',          'warning',            '非空压力异常' , 'D灯归压力异常'                  UNION ALL
    SELECT '喷雾机',          'error',              '喷涂模块异常' , '喷涂模块异常'                   UNION ALL
    SELECT '抽芯机',          'error',              '故障停机'     , 'C602单元常状状态异常'           UNION ALL
    SELECT '求温机',          'error',              '过载停机'     , 'C602过温异常'                   UNION ALL
    SELECT '取件机',          'warning',            '正常异响'     , 'xx通道异常'                     UNION ALL
    SELECT '点冷机',          'running',            '正常开机'     , 'xx温度正常'
) s ON d.device_name = s.name;

-- ----- 热成像: 20个点位报警阈值配置 -----
INSERT OR IGNORE INTO thermal_alarm_config (point_index, point_name, temp_high, temp_low) VALUES
    (1, '点位01',80,0),(2,'点位02',80,0),(3,'点位03',80,0),(4,'点位04',80,0),
    (5,'点位05',80,0),(6,'点位06',80,0),(7,'点位07',80,0),(8,'点位08',80,0),
    (9,'点位09',80,0),(10,'点位10',80,0),(11,'点位11',80,0),(12,'点位12',80,0),
    (13,'点位13',80,0),(14,'点位14',80,0),(15,'点位15',80,0),(16,'点位16',80,0),
    (17,'点位17',80,0),(18,'点位18',80,0),(19,'点位19',80,0),(20,'点位20',80,0);

-- ----- 管路配方: 默认参数值 -----
INSERT OR IGNORE INTO pipeline_params (param_name, param_value, param_unit, min_value, max_value) VALUES
    ('压力设定', 85.0, 'MPa',  60.0, 120.0),
    ('温度设定', 680.0, '℃',   600.0, 750.0),
    ('流量设定', 2.85, 'm/s',  1.5, 4.5),
    ('阀门开度', 75,   '%',    0, 100);

-- ----- 安灯: 8种呼叫类型配置 -----
INSERT OR IGNORE INTO andon_call_types (type_name, type_key, sort_order) VALUES
    ('质量异常',        'quality',      1),
    ('设备故障',        'device',       2),
    ('物料短缺',        'material',     3),
    ('安全告警',        'safety',       4),
    ('模具异常',        'mold',         5),
    ('工装辅助',        'tooling',      6),
    ('调取历史',        'history',      7),
    ('一键登录',        'login',        8);

-- ----- 安灯: 示例呼叫记录 (页面中6条) -----
INSERT OR IGNORE INTO andon_calls (id, call_type, call_detail, caller, call_time, status, handler) VALUES
    (1, '质量异常', '压铸件表面气孔超标，需停线检查',           '张工',   '2026-05-13 08:23:15', 'completed',  '李质检'),
    (2, '设备故障', 'C602单元常状状态异常，需要维修',           '王操作', '2026-05-13 09:10:42', 'processing', '赵维修'),
    (3, '物料短缺', '铝锭库存不足，需紧急补料',                 '陈班长', '2026-05-13 09:45:30', 'pending',    NULL),
    (4, '安全告警', '3号压铸机区域烟雾传感器触发',             '系统自动','2026-05-13 10:02:18', 'processing', '安保组'),
    (5, '模具异常', '红岛模次压铸工艺参数超差',                 '刘技师', '2026-05-13 10:30:55', 'pending',    NULL),
    (6, '工装辅助', '夹具定位销磨损需更换',                     '孙操作', '2026-05-13 11:15:22', 'completed',  '周工装');

-- ----- 工艺数据: 10条示例采集记录 -----
INSERT OR IGNORE INTO process_data (id, collect_time, device_code, product_model, batch_no,
    slow_speed, fast_speed, cast_pressure, boost_pressure, pour_temp, mold_temp, cycle_time, hold_time, data_status) VALUES
    (1, '2026-05-13 14:32:15','YZJ-001','P3500T','B20260513001',0.18,2.85,85.3,92.1,680,245,58.2,12.5,'normal'),
    (2, '2026-05-13 14:31:48','YZJ-001','P3500T','B20260513001',0.19,2.82,84.8,91.5,682,246,57.9,12.3,'normal'),
    (3, '2026-05-13 14:31:20','ZKJ-002','P3500T','B20260513001',0.17,2.90,86.1,93.2,678,243,58.5,12.8,'warning'),
    (4, '2026-05-13 14:30:55','YZJ-001','P3500T','B20260513001',0.21,2.75,83.2,89.8,675,240,59.1,13.0,'abnormal'),
    (5, '2026-05-13 14:30:28','PWJ-003','P5000T','B20260513002',0.20,3.15,92.5,101.2,700,258,62.3,14.2,'normal'),
    (6, '2026-05-13 14:29:50','CXJ-004','P2600T','B20260513003',0.16,2.50,78.5,84.2,650,232,52.8,10.5,'normal'),
    (7, '2026-05-13 14:29:12','QJJ-005','P3500T','B20260513001',0.18,2.88,85.0,91.8,681,244,58.0,12.6,'normal'),
    (8, '2026-05-13 14:28:35','YZJ-001','P3500T','B20260513001',0.19,2.83,85.5,92.5,679,245,57.8,12.4,'normal'),
    (9, '2026-05-13 14:28:00','ZKJ-002','P5000T','B20260513002',0.22,3.20,93.0,102.5,702,260,63.0,14.5,'warning'),
    (10,'2026-05-13 14:27:22','PWJ-003','P2600T','B20260513004',0.15,2.40,76.8,82.5,645,228,51.5,10.0,'abnormal');

-- ----- 工艺标准参数 (P3500T) -----
INSERT OR IGNORE INTO process_standards (product_model, param_name, param_key, standard_value, tolerance, unit) VALUES
    ('P3500T','慢压射速度','slow_speed',      0.18, 0.03, 'm/s'),
    ('P3500T','快压射速度','fast_speed',      2.85, 0.15, 'm/s'),
    ('P3500T','铸造压力',  'cast_pressure',   85.0, 3.0,  'MPa'),
    ('P3500T','增压压力',  'boost_pressure',  92.0, 4.0,  'MPa'),
    ('P3500T','浇注温度',  'pour_temp',       680,  15,   '℃'),
    ('P3500T','模具温度',  'mold_temp',       245,  10,   '℃'),
    ('P3500T','循环周期',  'cycle_time',      58.0, 3.0,  's'),
    ('P3500T','保压时间',  'hold_time',       12.5, 1.0,  's');

-- ----- 分析标准参数 (对应标准工艺参数面板) -----
INSERT OR IGNORE INTO analysis_standards (param_name, param_key, standard_value, tolerance, unit, display_order) VALUES
    ('慢压射速度','slow_speed',      0.18, 0.03, 'm/s', 1),
    ('快压射速度','fast_speed',      2.85, 0.15, 'm/s', 2),
    ('铸造压力',  'cast_pressure',   85.0, 3.0,  'MPa', 3),
    ('增压压力',  'boost_pressure',  92.0, 4.0,  'MPa', 4),
    ('浇注温度',  'pour_temp',       680,  15,   '℃',   5),
    ('模具温度',  'mold_temp',       245,  10,   '℃',   6),
    ('循环周期',  'cycle_time',      58.0, 3.0,  's',   7),
    ('保压时间',  'hold_time',       12.5, 1.0,  's',   8);

-- ----- 工件分析: 8条示例数据 -----
INSERT OR IGNORE INTO workpiece_analysis (id, workpiece_no, collect_time, device_code, product_model, batch_no,
    slow_speed, fast_speed, cast_pressure, boost_pressure, pour_temp, mold_temp, cycle_time, hold_time, judge_result) VALUES
    (1,'WJ202605130001','2026-05-13 14:32:15','YZJ-001','P3500T','B20260513001',0.18,2.85,85.3,92.1,680,245,58.2,12.5,'qualified'),
    (2,'WJ202605130002','2026-05-13 14:31:48','YZJ-001','P3500T','B20260513001',0.21,2.82,84.8,91.5,682,246,57.9,12.3,'warning'),
    (3,'WJ202605130003','2026-05-13 14:30:55','YZJ-001','P3500T','B20260513001',0.24,2.55,79.2,85.5,658,235,63.5,14.0,'unqualified'),
    (4,'WJ202605130004','2026-05-13 14:29:50','ZKJ-002','P3500T','B20260513001',0.17,2.90,86.1,93.2,668,243,58.5,12.8,'qualified'),
    (5,'WJ202605130005','2026-05-13 14:28:35','YZJ-001','P3500T','B20260513001',0.19,2.83,85.5,92.5,681,244,57.8,12.4,'qualified'),
    (6,'WJ202605130006','2026-05-13 14:27:22','ZKJ-002','P3500T','B20260513001',0.13,2.88,84.2,87.8,695,250,61.2,14.0,'unqualified'),
    (7,'WJ202605130007','2026-05-13 14:26:10','YZJ-001','P3500T','B20260513001',0.18,2.86,85.1,91.9,679,244,58.1,12.6,'qualified'),
    (8,'WJ202605130008','2026-05-13 14:24:55','ZKJ-002','P3500T','B20260513001',0.19,2.68,84.5,91.2,683,247,58.8,12.9,'warning');
