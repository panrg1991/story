# MES Monitor - 压铸车间监控系统

基于 Web 的 MES（制造执行系统）压铸车间设备监控平台，实现对压铸产线设备状态、工艺参数、产品质量的实时监控与数据管理。

## 功能模块

### 1. 设备状态监控
- 8 台压铸设备（红外钳机、压铸机、真空机、喷雾机、抽芯机、求温机、取件机、点冷机）实时状态展示
- 设备运行状态（运行/预警/故障）可视化
- 报警信息实时显示

### 2. 热成像温度检测
- 20 点位热成像温度采集与存储
- 温度阈值报警配置
- 热成像图片关联存储

### 3. 模具配方管理
- 模具基础信息管理
- 配方参数存储（一快速度、二快速度、增压压力等 14 项参数）

### 4. 管路数据监控
- 压力、温度、流量、阀门参数实时显示
- 参数下发修改记录追踪

### 5. 安灯呼叫系统
- 8 种呼叫类型（缺料、质量异常、设备故障等）
- 呼叫状态流转管理（待处理 → 处理中 → 已完成）

### 6. 工艺数据采集
- 8 项工艺参数实时采集（温度、压力、速度等）
- 与 P3500T 标准参数自动对比判定

### 7. 历史工件数据分析
- 工件检测数据与标准参数对比
- 合格/预警/不合格判定
- 历史数据趋势分析

## 技术栈

- **前端**: HTML + CSS + JavaScript
- **数据库**: SQLite
- **数据库驱动**: better-sqlite3 (Node.js)

## 数据库

17 张数据表覆盖全部功能模块，详见 `init_all.sql`。

### 初始化数据库

```bash
# 方式一：使用 sqlite3 CLI
sqlite3 mesmonitor.db < init_all.sql

# 方式二：使用 Node.js
npm install better-sqlite3
node -e "const Database=require('better-sqlite3');const db=new Database('mesmonitor.db');const fs=require('fs');db.exec(fs.readFileSync('init_all.sql','utf8'));console.log('Done')"
```

## 项目结构

```
mesmonitor/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   └── app.js          # 前端逻辑
├── init_all.sql        # 数据库初始化脚本
├── mesmonitor.db       # SQLite 数据库
└── README.md           # 项目说明
```

## 快速开始

1. 克隆项目
2. 初始化数据库（见上方命令）
3. 用浏览器打开 `index.html` 即可查看监控界面
