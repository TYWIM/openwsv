"""
OpenWSV Leaderboard Synchronizer & Reporter
Syncs benchmark results with the Vue 3 Leaderboard website data.
"""

import json
from typing import Dict, Any, List
import os


class LeaderboardSync:
    @staticmethod
    def print_terminal_summary(summary: Dict[str, Any]):
        """
        Prints a high-density Linear/DeepSWE-style terminal summary report.
        """
        model = summary["model_id"]
        score = summary["pass_rate_pct"]
        conf = summary["confidence_margin_pct"]
        topo = summary["topology_f1_pct"]
        afford = summary["affordance_acc_pct"]
        temporal = summary["state_transition_acc_pct"]
        cache = summary["cache_hit_rate_pct"]
        cost = summary["avg_cost_usd"]
        latency = summary["avg_latency_ms"]

        print("\n" + "=" * 68)
        print(f"  OpenWSV - BenchMark Evaluation Summary  |  StarLife AI")
        print("=" * 68)
        print(f"  Model Under Test : {model} ({summary['provider']})")
        print(f"  Overall Score    : {score}% ± {conf}% (Pass@1)")
        print("-" * 68)
        print(f"  Spatial Topology : {topo}% F1 score")
        print(f"  3D Affordance    : {afford}% Collision & Reachability")
        print(f"  State Dynamics   : {temporal}% Causal Consistency")
        print(f"  VLM Cache Hit    : {cache}% (Two-Stage Cascaded Settlement)")
        print(f"  Inference Latency: {latency} ms")
        print(f"  Average Cost     : ${cost:.3f} per task")
        print("-" * 68)
        print("  Task Breakdown:")
        for t in summary.get("task_breakdown", []):
            status = "PASS" if t["passed"] else "FAIL"
            color_mark = "✓" if t["passed"] else "✗"
            print(f"    [{color_mark}] {t['task_id']:<22} | {t['title']:<40} | {status}")
        print("=" * 68 + "\n")

    @staticmethod
    def export_results_json(summary: Dict[str, Any], output_path: str = "openwsv_results.json"):
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        print(f"✓ Results exported to: {output_path}")
