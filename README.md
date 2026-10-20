# StarLife-1-WSV — Evaluation Frontend

StarLife-1-WSV 观测模型评测系统的**前端**（Vue 3 + Vite 6 + Tailwind CSS 4）。
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
- 数值口径见 `starlife_eval/ARCHITECTURE.md` §5.6：`score = 100 × event.macro_f1`、
  `topologyF1 = 100 × relation_type_acc`、`affordanceAcc = 100 × attrs_acc`、
  `stateTransitionAcc = 100 × change_top1`；`latency` 为实测毫秒，`cost` 仅在真实计价口径下给出。
- **null 语义**：任何数值字段为 `null` 表示"该维度没有真实测量值"，前端渲染为 `N/A`，
  散点图跳过该点、对应 X 轴维度禁用，绝不显示 0 或占位值。
- `leaderboard.generated.json` 缺失或 `models: []` 时，页面显示"尚无评测结果"空态，不白屏。

> `src/data/leaderboard.generated.json` 里若出现 `_note: "SAMPLE for dev only…"`，
> 说明它还是本地联调用的样例（数值为占位），**必须**被后端真实产物覆盖后再发布。

静态方法论文案（5 个判别任务、评测协议）在 `src/data/benchmarkContent.ts`，
不是评测结果，也不需要后端生成。

## 数据契约（供后端对齐，示例取自真实产物）

```jsonc
{
  "schemaVersion": 1,
  "meta": {
    "benchmark": "StarLife-1-WSV 观测模型评测", "split": "test",
    "nPairs": 60, "nTestPairs": 200,
    "dataset": "dataset_spatial_v2", "checkpoints": "checkpoints/pilot_v2g",
    "sampleSeed": 20261020, "generatedAt": "2026-10-20T14:18:46+00:00",
    "sourceRun": "runs/v2g_pair",
    "artifacts": { "features_sha256_16": "…", "manifest_sha256_16": "…", "cloud_cache_sha256_16": "…" },
    "telemetry": { "tasks": 5, "scenes": null, "pairs": 60, "testPairs": 200,
                   "slots": 5830, "relations": 2575, "models": 2 }
  },
  "models": [{
    "id": "starlife-1-wsv-lite-v2g", "name": "starlife-1-wsv-lite-v2g",
    "family": "StarLife", "provider": "StarLife AI", "mode": "LOCAL-HEADS",
    "version": "v1.1", "isBest": true, "confidence": null,
    "score": 72.2, "topologyF1": 90.3, "affordanceAcc": 97.2, "stateTransitionAcc": 91.3,
    "cost": 0.0, "tokens": null, "tokenNum": null, "latency": 1718.4,
    "na": {},
    "metrics": {
      "head": { "change_top1": 0.927, "change_macro_f1": 0.698,
                "type_top1": 0.936, "type_macro_f1": 0.923,
                "relation_top1": 0.774, "relation_macro_f1": 0.770,
                "rel_pos_top1": 0.704, "rel_pos_macro_f1": 0.584,
                "attrs_contact_f1": 0.890, "attrs_support_f1": 0.870, "attrs": 0.880 },
      "pair": { "change_top1": 0.9135, "change_macro_f1": 0.6409,
                "relation_type_acc": 0.9034, "rel_pos_acc": 0.7736, "attrs_acc": 0.9717 },
      "event": { "macro_f1": 0.5865, "macro_f1_common": 0.7219,
                 "common_kinds": ["StateChanged", "RelationAdded"],
                 "matched_total": 197,
                 "available_kinds": ["EntityCreated", "StateChanged", "RelationAdded"] },
      "state": 0.9308
    }
  }]
}
```

- `score`/`topologyF1`/`affordanceAcc`/`stateTransitionAcc` 是 **0–100 的百分数**（§5.6 映射）；
  `metrics.*` 是 0–1 比例，UI 展开明细时显示为百分比。
- 数值字段允许 `null`；`null` 在 UI 渲染为 `N/A`，散点图跳过该点、对应 X 轴维度禁用。
- `metrics` 可选，表格行可展开查看明细；缺失（或某分组为 `null`）时对应分组不显示。
  注意 `metrics.state` 是**数字**（state_acc），`head`/`pair`/`event` 是对象。
- `version`/`isBest` 用于筛选与强调；`confidence` 目前恒为 `null`（未做 95% bootstrap），UI 隐藏。
- `na` 给字段级 N/A 原因（例如云端零样本没有头级概率分布）；UI 在展开行里按可读标签显示。
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
