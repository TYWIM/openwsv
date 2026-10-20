# OpenWSV - BenchMark

> **Open World State Verification Benchmark for Multimodal AI**  
> 专为 **具身世界大模型** 体系深度定制的前沿多模态世界状态验证、3D 空间拓扑与物理因果评测平台。  
> 开发者：**StarLife AI**（西安花濑科技）

![Vue 3](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)
![Vite](https://img.shields.io/badge/Vite-6.x-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8.svg)
![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)
![Tests](https://img.shields.io/badge/Tests-Passing-success.svg)

---

## 🎯 基准评测定位与 StarLife-1-WSV 核心架构契合

OpenWSV 基准评测专门测试大模型（多模态 MLLM）在理解**物理世界状态（World State）**与**空间拓扑关系（Spatial Topology）**上的真实能力，针对传统 2D VQA 评测无法区分多模态大模型“视觉猜测”与“真实物理世界感知”的痛点，结合 StarLife 路演核心技术体系构建：

1. **两阶段级联沉降门控评测（Two-Stage Cascaded Settlement Gating）**：
   - **Stage 0 运动沉降状态机（FSM）**：评测模型在快速运动模糊中的状态收敛抑制能力；
   - **Stage 1 局部 SSIM 结构方差门控**：评测过滤阴影扰动与光照渐变的能力；
   - **核心指标**：验证模型能否达到 **>65% 的 VLM 缓存命中率** 与 100% 物理跃迁召回率。
2. **纯关键字空间拓扑判别头（Pure-Keyword Spatial Topology Head）**：
   - 评测物体间的排他物理关系：`ON`（重力支撑）、`INSIDE`（容器容纳）、`OCCLUDES`（视线遮挡）、`PROXIMATE`（空间邻近）；
   - **物理互斥约束自动闭合**：验证“放入盒内”是否自动切断旧桌面的支撑关系。
3. **单写者事件溯源世界引擎（Single-Writer Event-Sourcing WorldStore）**：
   - 验证四类原子事件流完整性：`APPEARED` → `MOVED` → `RELATION_CHANGED` → `DISAPPEARED`；
   - **时态世界图（Time-Travel State Querying）**：评测在任意历史时刻 `T` 恢复场景无错快照的能力（如 180° 相机旋转后对被遮挡物体的坐标恒常性追踪）。
4. **具身物理可达性与防碰撞流形（6-DoF Embodied Affordance & PhysX）**：
   - 通过确定性射线投射与包围盒扫掠，评测机械臂/机器狗末端轨迹防碰撞及重心平衡静态稳定判别。
5. **标准 MCP 协议输出（Model Context Protocol）**：
   - 验证标准 Tool Call 接口的毫秒级时序响应与格式一致性。

---

## 🧪 评测管线代码架构 (`openwsv_eval/`)

在项目根目录构建了完整的原生 Python 评测工具包：

```text
E:\Project\OepnWSV_BenchMark\
├── run_eval.py                         # 快速评测执行入口
├── openwsv_eval/                        # 评测管线核心包
│   ├── cli.py                          # 命令行界面 (CLI)
│   ├── core/
│   │   ├── types.py                    # 实体、3D BBox、拓扑边、原子事件、门控遥测类型定义
│   │   └── task.py                     # 场景相机参数、RGB-D 帧数据与判题契约 Schema
│   ├── dataset/
│   │   └── loader.py                   # 4 种模态 (RGB-D, Multi-view, Video, Pointcloud) 场景加载器
│   ├── models/
│   │   ├── base.py                     # 多模态模型抽象基类接口
│   │   ├── starlife.py                 # StarLife-1-WSV 与 StarLife-1-WSV-Lite 专用世界模型适配器
│   │   └── baselines.py                # Gemini 2.0, GPT-5 Omni, Claude 3.5 等基线模型适配器
│   ├── verifiers/
│   │   ├── topology_verifier.py        # 空间拓扑图、DAG 无环性与物理互斥约束确定性判题器
│   │   ├── temporal_verifier.py        # 时序单调性、事件生命周期与时间旅行状态重构判题器
│   │   ├── affordance_verifier.py      # 3D IoU、6-DoF 机械臂扫掠防碰撞与重心平衡判题器
│   │   └── gating_verifier.py          # 两阶段沉降门控缓存复用率与跃迁召回率判题器
│   ├── runner/
│   │   └── executor.py                 # 多线程高并发场景执行器与指标归纳引擎
│   ├── report/
│   │   └── leaderboard_sync.py         # 终端高密度仪表盘输出与 JSON 导出
│   └── tests/
│       └── test_starlife_pipeline.py   # 单元与集成测试套件 (100% 测试通过)
```

---

## ⚡ 运行评测流程

### 1. 运行单元与集成测试套件
```bash
python -m unittest openwsv_eval.tests.test_starlife_pipeline
```

### 2. 评测 StarLife-1-WSV 旗舰世界模型
```bash
python run_eval.py run --model starlife-1-wsv
```

### 3. 评测 StarLife-1-WSV-Lite 端侧轻量版（适配树莓派/Jetson等专利外设硬件）
```bash
python run_eval.py run --model starlife-1-wsv-lite
```

### 4. 横向多模型对比评测（StarLife vs Gemini 2.0 vs GPT-5 Omni）
```bash
python run_eval.py compare --models starlife-1-wsv,starlife-1-wsv-lite,gemini-2.0-pro,gpt-5-omni
```

运行后将打印类似如下的终端高密度技术摘要，并自动导出评测数据至 `openwsv_eval_result.json`：
```text
==============================================================================
  OpenWSV Multi-Model Comparison Matrix
==============================================================================
  Model                  | Score      | Topo F1    | Cache Hit  | Latency  | Cost  
  --------------------------------------------------------------------------
  starlife-1-wsv         | 84.8% ±2.2 | 89.6    % | 70.0    % | 320.0 ms | $0.42
  starlife-1-wsv-lite    | 76.4% ±2.6 | 80.2    % | 70.0    % | 120.0 ms | $0.15
  gemini-2.0-pro         | 81.4% ±2.4 | 85.2    % | 0.0     % | 1250.0ms | $3.20
  gpt-5-omni             | 79.8% ±2.6 | 84.1    % | 0.0     % | 1480.0ms | $4.80
==============================================================================
```

---

## 🌐 启动 Leaderboard 网页端

```bash
cd E:\Project\OepnWSV_BenchMark

# 安装依赖（若未安装）
npm install

# 启动开发服务器
npm run dev

# 生产环境构建
npm run build
```
在浏览器打开 `http://localhost:5173` 即可查看 StarLife-1-WSV 位于榜首及 Pareto 散点图最右上角（Most Efficient）的完整评测呈现！
