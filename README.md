# OpenWSV — World-State Vision Benchmark（站点）

OpenWSV（简称 WSV）榜单的静态前端（Vue 3 + Vite 6 + Tailwind CSS 4）。
数据来自评测仓库 [TYWIM/starlife_eval](https://github.com/TYWIM/starlife_eval) 的冻结框架
`openwsv-1`：同一套数据 sha256、同一个检测器（GroundingDINO-tiny，权重 sha256 固定）、
同一套提示词与判分器，文本多模态模型与结构化世界模型在同一口径下比较。

## 页面结构

- **主榜**：默认「综合分」排名（已出分能力等权平均，当前仅 T1）；顶部 tab 切换
  T1 单图空间关系 / T1 关系子集 / T4 空间变化 / T5 关系变化 / T6 状态回放 / T8 抽象几何，
  未出分的子类只显示「待跑」占位，不显示任何数字。
- **评测协议**：数据 / 检测器 / 提示词 / 判分器 / 种子五行冻结项。
- **数据集**：OpenWSV 自有 suite（单图空间关系 1,612 题；结构化世界状态 1,000 对；抽象几何待建）。
- **复现**：一条命令，结果 JSON 携带完整框架指纹。

## 数据文件

页面是纯静态的，运行时无 API 调用：

```
src/data/openwsv.generated.json   # 榜单数据（boards / protocol / datasets / repro）
```

该文件由评测仓库生成后手工同步；任何未测得的指标显示 `待跑`，不写 `0`、不写估算值。

## 本地运行

```bash
pnpm install
pnpm dev        # 开发预览
pnpm build      # 产物在 dist/
```

## 规范

- 不写 SOTA / 榜首类表述；只报指标、覆盖率与 95% bootstrap CI；
- 未覆盖 ≠ 答错；
- 不展示未测得的分数。
