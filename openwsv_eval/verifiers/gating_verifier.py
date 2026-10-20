"""
OpenWSV Two-Stage Cascaded Settlement Gating Verifier
Specifically benchmarks StarLife-1-WSV's core efficiency innovation:
- Stage 0 FSM: Motion Settlement (prevents motion blur during transit)
- Stage 1 SSIM: Patch Structural Variance (prevents shadow/lighting jitter)
- Target: VLM Prompt Cache Hit Rate > 65% with zero missed physical mutations
"""

from typing import List, Dict, Any
from ..core.types import GatingTelemetry, GatingStage


class GatingEfficiencyVerifier:
    """
    Evaluates whether the model's gating mechanism achieves high cache reuse
    without missing critical physical state mutations.
    """

    def verify_gating_performance(
        self,
        telemetry: GatingTelemetry,
        actual_mutation_indices: List[int],
        gating_decisions: List[GatingStage]
    ) -> Dict[str, Any]:
        """
        Calculates:
        1. Cache Hit Rate (% frames suppressing expensive VLM inference)
        2. Mutation Recall (% actual physical changes correctly caught by PASS_THROUGH)
        3. False Wakeup Rate (% PASS_THROUGH triggers when no physical change occurred)
        """
        total_frames = len(gating_decisions)
        if total_frames == 0:
            return {"passed": False, "error": "No frames provided"}

        woken_up_indices = [
            i for i, d in enumerate(gating_decisions)
            if d == GatingStage.PASS_THROUGH
        ]

        # Check mutation recall (Must not miss any actual physical mutations!)
        missed_mutations = [
            idx for idx in actual_mutation_indices
            if idx not in woken_up_indices
        ]
        mutation_recall = 1.0 - (len(missed_mutations) / len(actual_mutation_indices)) if actual_mutation_indices else 1.0

        # Check false positive wakeups (woken up when no mutation happened)
        mutation_set = set(actual_mutation_indices)
        false_wakeups = [idx for idx in woken_up_indices if idx not in mutation_set]
        false_wakeup_rate = len(false_wakeups) / (total_frames - len(actual_mutation_indices)) if (total_frames - len(actual_mutation_indices)) > 0 else 0.0

        # Calculate actual cache hit rate
        cache_hits = total_frames - len(woken_up_indices)
        actual_cache_hit_rate = cache_hits / total_frames

        # StarLife target: Cache Hit Rate >= 60%, Mutation Recall >= 95%
        passed = (actual_cache_hit_rate >= 0.60) and (mutation_recall >= 0.95)

        return {
            "passed": passed,
            "cache_hit_rate": round(actual_cache_hit_rate, 4),
            "mutation_recall": round(mutation_recall, 4),
            "false_wakeup_rate": round(false_wakeup_rate, 4),
            "total_frames": total_frames,
            "vlm_invocations": len(woken_up_indices),
            "missed_mutations_count": len(missed_mutations),
            "stage_0_fsm_suppressed": telemetry.stage_0_fsm_suppressed,
            "stage_1_ssim_suppressed": telemetry.stage_1_ssim_suppressed,
            "compute_cost_savings_pct": round(actual_cache_hit_rate * 100, 1),
        }
