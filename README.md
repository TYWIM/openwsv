# 空间理解与关系推理基准 — Benchmark Frontend

**Spatial & Relational Understanding Benchmark** 的前端（Vue 3 + Vite 6 + Tailwind CSS 4）。
这不是"某个模型的榜"，而是一个**通用模型的空间关系理解小切面基准**：

> 给定两帧画面 + 槽位表，测的是任何视觉语言模型能否输出正确的**变化、空间关系、接触支撑**，
> 并把它们组装成**结构化的世界状态更新**。任何能输出 changes / relations 的 VLM 都能提交
> （零样本或专用头均可）。StarLife-1-WSV-Lite 只是榜单里的一个参赛条目（本地头），
> 不是这个基准的全部。

本目录是上游 `openwsv` 仓库 UI 的派生版本：只复用其页面结构与视觉样式，
**不包含任何 mock 数据或 demo 评测后端**。

## 数据来源（唯一）

页面上的所有评测结果来自：

```
src/data/leaderboard.generated.json
```

该文件由 `starlife_eval`（本仓库 `starlife_eval/report/leaderboard.py`）从真实运行产物生成：

```bash
python -m starlife_eval leaderboard --run runs/v2g_real \
  --out third_party/openwsv/src/data/leaderboard.generated.json
```

- 前端**不调用任何接口**，只 import 这个静态 JSON；页面刷新即可看到新结果。
- **榜单主分是 `compositeScore`（7 维等权综合分，0–100）**，按它排序与显示；
  `score`（可比事件分）等旧字段**保留**为展开明细，没有删除。
  综合分口径来自 `meta.composite`（等权、缺项自动从分母剔除），见下节契约。
- 页面只保留一个运行时指标：**`latency`**（每事件端到端，含特征抽取 / API 往返；
  云端受网络与输出长度影响）。**不展示成本、token 用量，也不把实体类别/词表分类当作基准项。**
- 数值口径见 `starlife_eval/ARCHITECTURE.md` §5.6：`score = 100 × event.macro_f1_common`、
  `topologyF1 = 100 × relation_type_acc`、`affordanceAcc = 100 × attrs_acc`、
  `stateTransitionAcc = 100 × change_top1`。
- **null 语义**：任何数值字段为 `null` 表示"该维度没有真实测量值"，前端渲染为 `N/A`，
  散点图跳过该点，绝不显示 0 或占位值。
- `leaderboard.generated.json` 缺失或 `models: []` 时，页面显示"尚无评测结果"空态，不白屏。

> `src/data/leaderboard.generated.json` 里若出现 `_note: "SAMPLE for dev only…"`，
> 说明它还是本地联调用的样例（数值为占位），**必须**被后端真实产物覆盖后再发布。

静态文案（基准标题/副题/一句话定位、4 个判别任务、评测协议、7 维综合分的人话说明、
"世界模型六层"定位）在 `src/data/benchmarkContent.ts`，不是评测结果，也不需要后端生成。

## 数据契约（v3，供后端对齐，示例取自真实产物）

```jsonc
{
  "schemaVersion": 3,
  "meta": {
    "benchmark": "空间理解与关系推理基准", "split": "test",
    "nPairs": 60, "nTestPairs": 200,
    "dataset": "dataset_spatial_v2", "checkpoints": "checkpoints/pilot_v2g",
    "sampleSeed": 20261020, "generatedAt": "2026-10-20T16:08:05+00:00",
    "sourceRun": "/workspace/starlife_eval/runs/full_v11",
    "artifacts": { "features_sha256_16": "…", "manifest_sha256_16": "…", "cloud_cache_sha256_16": "…" },
    "telemetry": { "tasks": 5, "scenes": null, "pairs": 60, "testPairs": 200,
                   "slots": 5830, "relations": 2575, "models": 6 },
    "scope": {
      "tested": ["状态估计", "变化识别", "关系与拓扑", "空间方位",
                 "接触/支撑(affordance)", "事件化", "世界状态一致性"],
      "notTested": ["实体类型/词表分类（云端无类型输出，且不是本基准要测的能力）",
                    "token 用量与成本",
                    "生成式未来画面预测（future rollout）"],
      "openTo": "任何能输出 changes/relations 的视觉语言模型（零样本或专用头均可）"
    },
    "composite": {
      "name": "综合能力分", "method": "equal-weight",
      "formula": "7 个维度（0-100）等权平均；缺项自动从分母剔除，不当 0 分",
      "n_dims": 7,
      "dims": [
        { "key": "change_top1", "group": "变化识别", "label": "变化识别 top1",
          "source": "pair_protocol.change_top1" },
        { "key": "change_balance", "group": "变化平衡性", "label": "变化平衡性 (macroF1)",
          "source": "pair_protocol.change_macro_f1" },
        { "key": "relation_type", "group": "关系类型", "label": "关系类型准确率",
          "source": "pair_protocol.relation_type_acc" },
        { "key": "rel_pos", "group": "空间方位", "label": "空间方位准确率",
          "source": "pair_protocol.rel_pos_acc" },
        { "key": "attrs", "group": "接触支撑", "label": "接触/支撑准确率",
          "source": "pair_protocol.attrs_acc" },
        { "key": "event_f1", "group": "事件级 F1", "label": "事件级 F1",
          "source": "event_metrics.macro_f1_common" },
        { "key": "state_consistency", "group": "世界状态一致性", "label": "世界状态一致性",
          "source": "state_replay.state_acc_common" }
      ],
      "note": "总分依赖权重；这里用等权并公开逐维分数，任何人都能按自己的场景重算。"
    }
  },
  "models": [{
    "id": "starlife-1-wsv-lite-v2", "name": "starlife-1-wsv-lite-v2",
    "family": "StarLife", "provider": "StarLife AI", "mode": "LOCAL-HEADS",
    "providerColor": "var(--color-starlife)",
    "version": "v1.1", "isBest": true, "confidence": null,
    "compositeScore": 83.7,
    "composite": {
      "method": "equal-weight",
      "weights": [0.142857, 0.142857, 0.142857, 0.142857, 0.142857, 0.142857, 0.142857],
      "available": 7, "total": 7,
      "dims": [
        { "key": "change_top1", "group": "变化识别", "label": "变化识别 top1",
          "value": 92.8, "source": "pair_protocol.change_top1", "available": true },
        { "key": "change_balance", "group": "变化平衡性", "label": "变化平衡性 (macroF1)",
          "value": 66.3, "source": "pair_protocol.change_macro_f1", "available": true },
        { "key": "relation_type", "group": "关系类型", "label": "关系类型准确率",
          "value": 90.9, "source": "pair_protocol.relation_type_acc", "available": true },
        { "key": "rel_pos", "group": "空间方位", "label": "空间方位准确率",
          "value": 71.2, "source": "pair_protocol.rel_pos_acc", "available": true },
        { "key": "attrs", "group": "接触支撑", "label": "接触/支撑准确率",
          "value": 97.2, "source": "pair_protocol.attrs_acc", "available": true },
        { "key": "event_f1", "group": "事件级 F1", "label": "事件级 F1",
          "value": 75.4, "source": "event_metrics.macro_f1_common", "available": true },
        { "key": "state_consistency", "group": "世界状态一致性", "label": "世界状态一致性",
          "value": 92.4, "source": "state_replay.state_acc_common", "available": true }
      ]
    },
    "score": 75.4, "topologyF1": 90.9, "affordanceAcc": 97.2, "stateTransitionAcc": 92.8,
    "latency": 1716.8,
    "na": {},
    "metrics": {
      "head": { "change_top1": 0.936, "change_macro_f1": 0.723,
                "relation_top1": 0.793, "relation_macro_f1": 0.786,
                "rel_pos_top1": 0.688, "rel_pos_macro_f1": 0.538,
                "attrs_contact_f1": 0.888, "attrs_support_f1": 0.869, "attrs": 0.879 },
      "pair": { "change_top1": 0.928, "change_macro_f1": 0.6628,
                "relation_type_acc": 0.9091, "rel_pos_acc": 0.7125, "attrs_acc": 0.9719 },
      "event": { "macro_f1": 0.5695, "macro_f1_common": 0.7542,
                 "common_kinds": ["StateChanged", "RelationAdded"],
                 "matched_total": 197,
                 "available_kinds": ["EntityCreated", "StateChanged", "RelationAdded"] },
      "state": 0.9334
    }
  }]
}
```

- **删除字段（不是改名）**：`models[]` 不再有 `cost`、`tokens`、`tokenNum`；
  页面也不再展示这三项，运行时指标只剩 `latency`。
- `metrics.head` 只保留 change / relation / rel_pos / attrs 相关键，**没有 `type_*`**；
  实体类别/词表分类不再作为基准项（页面不展示）。
- `compositeScore` 是**榜单主分**（0–100）；`composite.dims` 固定 7 项（`key` 为
  `change_top1`/`change_balance`/`relation_type`/`rel_pos`/`attrs`/`event_f1`/`state_consistency`），
  `value` 已 ×100、`available=false` 或缺项时自动从分母剔除。前端展开行渲染 7 维小条 +
  `meta.composite.formula` 一行字 + `weights` 来源说明（等权 1/7，不预设哪个维度更重要），
  并按 `key` 匹配 `benchmarkContent.ts` 里"一句话 + 怎么看"的人话说明。
- `meta.scope` 由前端渲染为"基准范围"：测什么（tested）、不测什么（notTested）、对谁开放（openTo）。
- **参赛方式**：`mode` 为 `LOCAL-HEADS` 的行在前端显示为 `local-heads`（有监督专用头），
  `ZERO-SHOT` 显示为 `zero-shot`（零样本通用模型）。页面明确提示**两类不可直接等量齐观**
  （专用头见过训练集、零样本没有），详见 reliability 报告。
- **综合分依赖权重（已知性质）**：换一组权重，云端 4 个模型的名次会互换，但本地两行始终第一；
  详见 reliability 报告。因此本页不做"绝对排名"表述；前两名（v2 / v2g）综合分差 0.1 分，
  约等于打平（差值由前端按数据实时计算，不手抄）；行内只有 `isBest` 徽标，没有"第 N 强"文案。
- 7 维中的两个口径提醒放在展开区 tooltip：`rel_pos` 只统计**关系判定正确后**的方位；
  `state_consistency` **不含实体类别维度**。
- `score`/`topologyF1`/`affordanceAcc`/`stateTransitionAcc` 是 **0–100 的百分数**（§5.6 映射），
  现在作为**明细**保留；`metrics.*` 是 0–1 比例，UI 展开明细时显示为百分比。
  UI 的旧字段/明细数值全部直接读该 JSON，不手抄。
- 数值字段允许 `null`；`null` 在 UI 渲染为 `N/A`，散点图跳过该点。
- `metrics` 可选，表格行可展开查看明细；缺失（或某分组为 `null`）时对应分组不显示。
  注意 `metrics.state` 是**数字**（state_acc），`head`/`pair`/`event` 是对象。
- `version`/`isBest` 用于筛选与强调；`confidence` 目前恒为 `null`（未做 95% bootstrap），UI 隐藏。
- `na` 给字段级 N/A 原因（例如云端零样本没有头级概率分布）；UI 在展开行里按可读标签显示，
  并过滤掉已移除口径（用量/成本/类别）的旧键，不显示空 tooltip。
- `meta.telemetry` 只用于首页计数，取不到的键写 `null`（UI 隐藏该项，不写死）：
  `pairs` = 每模型实际评测的对数（60，榜单可比范围），`testPairs` = test split 总对数（数据集规模）。

## 开发 / 构建

```bash
# 依赖（二选一）
pnpm install
# 或（仓库自带 package-lock.json）
npm ci

# 生产构建
pnpm build      # 等价于 vite build / npm run build

# 本地预览构建产物（可选）
pnpm preview
```

构建产物在 `dist/`。仓库不提供常驻服务；生产环境用任意静态服务器托管 `dist/` 即可。

## 与上游的关系

- 上游仓库：<https://github.com/TYWIM/openwsv>（UI 来源，clone commit 见本目录 git 历史）。
- 已删除的上游 demo 后端（Python 评测包与评测 runner 脚本）。它们全是 mock
  （编造分数、假 leaderboard、无 3D 数据跑 affordance/gating 判题），不再属于本系统。
  真实后端是 `starlife_eval`。
- License：截至本目录 clone 时，上游仓库**未附带 LICENSE 文件**。本派生前端仅用于
  StarLife 内部评测系统；若上游后续补充许可证，以该上游许可证为准。
