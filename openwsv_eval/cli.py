"""
OpenWSV Benchmark CLI Entrypoint
Run:
    python -m openwsv_eval.cli run --model starlife-1-wsv
    python -m openwsv_eval.cli compare --models starlife-1-wsv,gemini-2.0-pro,gpt-5-omni
"""

import argparse
import sys
from typing import List

from .dataset.loader import BenchmarkDatasetLoader
from .runner.executor import BenchmarkExecutor
from .models.starlife import StarLifeWorldModel
from .models.baselines import get_baseline_model
from .report.leaderboard_sync import LeaderboardSync


def get_model(name: str):
    name_clean = name.strip().lower()
    if "starlife" in name_clean:
        is_lite = "lite" in name_clean
        return StarLifeWorldModel(
            model_id="starlife-1-wsv-lite" if is_lite else "starlife-1-wsv",
            mode="HIGH" if is_lite else "XHIGH"
        )
    return get_baseline_model(name_clean)


def main():
    parser = argparse.ArgumentParser(
        prog="openwsv-eval",
        description="OpenWSV - BenchMark Evaluation Harness for Multimodal World Models"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcommand: run
    run_parser = subparsers.add_parser("run", help="Run benchmark on a single model")
    run_parser.add_argument("--model", type=str, default="starlife-1-wsv", help="Model identifier to evaluate")
    run_parser.add_argument("--limit", type=int, default=None, help="Limit number of scenarios")
    run_parser.add_argument("--output", type=str, default="openwsv_eval_result.json", help="Path to save result JSON")

    # Subcommand: compare
    comp_parser = subparsers.add_parser("compare", help="Compare multiple models across OpenWSV")
    comp_parser.add_argument(
        "--models",
        type=str,
        default="starlife-1-wsv,starlife-1-wsv-lite,gemini-2.0-pro,gpt-5-omni",
        help="Comma-separated list of models"
    )
    comp_parser.add_argument("--limit", type=int, default=None, help="Limit number of scenarios")

    args = parser.parse_args()

    loader = BenchmarkDatasetLoader()
    executor = BenchmarkExecutor()

    scenarios = loader.load_benchmark_suite(limit=args.limit)
    print(f"\n[OpenWSV Harness] Loaded {len(scenarios)} benchmark evaluation scenarios.")

    if args.command == "run":
        model = get_model(args.model)
        print(f"[OpenWSV Harness] Evaluating model: {model.model_id} ({model.provider})...")
        summary = executor.run_benchmark(model, scenarios)
        LeaderboardSync.print_terminal_summary(summary)
        LeaderboardSync.export_results_json(summary, args.output)

    elif args.command == "compare":
        model_names = [m.strip() for m in args.models.split(",") if m.strip()]
        summaries = []
        for m_name in model_names:
            model = get_model(m_name)
            print(f"\n[OpenWSV Harness] Evaluating {model.model_id}...")
            s = executor.run_benchmark(model, scenarios)
            summaries.append(s)
            LeaderboardSync.print_terminal_summary(s)

        # Print comparison table
        print("\n" + "=" * 78)
        print("  OpenWSV Multi-Model Comparison Matrix")
        print("=" * 78)
        header = f"  {'Model':<22} | {'Score':<10} | {'Topo F1':<10} | {'Cache Hit':<10} | {'Latency':<8} | {'Cost':<6}"
        print(header)
        print("  " + "-" * 74)
        for s in summaries:
            row = (
                f"  {s['model_id']:<22} | "
                f"{s['pass_rate_pct']:<5}% ±{s['confidence_margin_pct']} | "
                f"{s['topology_f1_pct']:<8}% | "
                f"{s['cache_hit_rate_pct']:<8}% | "
                f"{s['avg_latency_ms']:<6}ms | "
                f"${s['avg_cost_usd']:.2f}"
            )
            print(row)
        print("=" * 78 + "\n")


if __name__ == "__main__":
    main()
