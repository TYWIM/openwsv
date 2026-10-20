"""
OpenWSV General Multimodal Baseline Adapters
Simulates standard frontier MLLMs (Gemini, GPT-5, Claude, Qwen-VL):
- Lack Two-Stage Settlement Gating (0% cache hit, full video frame token ingestion)
- Tend to suffer from 2D projection confusion (mistaking 2D overlap for 3D proximity)
- Lack native Event Sourcing log output
"""

from typing import Dict, List, Any
from .base import BaseMultimodalModel
from ..core.task import TaskScenario, ModelEvaluationOutput
from ..core.types import (
    WorldStateSnapshot,
    WorldEntity,
    TopologyEdge,
    BoundingBox3D,
    RelationType,
    GatingStage,
)


class GeneralMultimodalBaseline(BaseMultimodalModel):
    def __init__(
        self,
        model_id: str,
        provider: str,
        base_latency: float,
        cost_per_100: float,
        tokens_k: int,
        error_rate: float = 0.15
    ):
        super().__init__(model_id=model_id, provider=provider, mode="HIGH")
        self.base_latency = base_latency
        self.cost_per_100 = cost_per_100
        self.tokens_k = tokens_k
        self.error_rate = error_rate

    def evaluate_scenario(self, scenario: TaskScenario) -> ModelEvaluationOutput:
        gt_state = scenario.ground_truth_state

        # Entities prediction with slightly higher 3D coordinate error
        predicted_entities = {}
        for eid, ent in gt_state.entities.items():
            dx = 0.045  # 4.5cm error on standard VLM
            center = (
                round(ent.bbox_3d.center[0] + dx, 3),
                round(ent.bbox_3d.center[1] + dx, 3),
                round(ent.bbox_3d.center[2], 3),
            )
            bbox = BoundingBox3D(center=center, extents=ent.bbox_3d.extents)
            predicted_entities[eid] = WorldEntity(
                entity_id=eid,
                category=ent.category,
                bbox_3d=bbox,
                confidence=0.82,
            )

        # Baseline models occasionally miss occlusion edges or reverse depth order
        predicted_edges = []
        for i, e in enumerate(gt_state.topology_edges):
            if i % 5 == 0 and self.error_rate > 0.1:
                # Simulates 2D optical projection error: mistaking occlusion
                continue
            predicted_edges.append(
                TopologyEdge(
                    source_id=e.source_id,
                    target_id=e.target_id,
                    relation=e.relation,
                    confidence=0.78,
                    camera_view=e.camera_view,
                )
            )

        # Decision
        expected_decision = scenario.verification_rules.get("expected_decision", "FEASIBLE")

        snapshot = WorldStateSnapshot(
            timestamp_ms=1000,
            entities=predicted_entities,
            topology_edges=predicted_edges,
            event_log=[],  # General VLMs do not produce event-sourcing logs
            gating_status=GatingStage.PASS_THROUGH,
            metadata={"model": self.model_id}
        )

        return ModelEvaluationOutput(
            task_id=scenario.task_id,
            model_id=self.model_id,
            raw_response=f"VLM Text Response [Decision={expected_decision}]",
            predicted_state=snapshot,
            predicted_edges=predicted_edges,
            predicted_decision=expected_decision,
            gating_telemetry={"cache_hit_rate": 0.0, "vlm_invocations": 100},
            latency_ms=self.base_latency,
            tokens_consumed=self.tokens_k * 1000,
            estimated_cost_usd=self.cost_per_100,
        )


def get_baseline_model(model_name: str) -> BaseMultimodalModel:
    name = model_name.lower()
    if "gemini-2" in name:
        return GeneralMultimodalBaseline("gemini-2.0-pro", "Google", 1250, 3.20, 44, error_rate=0.08)
    elif "gpt-5" in name:
        return GeneralMultimodalBaseline("gpt-5-omni", "OpenAI", 1480, 4.80, 52, error_rate=0.09)
    elif "claude-3-5" in name:
        return GeneralMultimodalBaseline("claude-3.5-sonnet", "Anthropic", 1390, 3.90, 38, error_rate=0.11)
    elif "qwen" in name:
        return GeneralMultimodalBaseline("qwen2.5-vl-72b", "Qwen", 980, 1.45, 36, error_rate=0.13)
    elif "deepseek" in name:
        return GeneralMultimodalBaseline("deepseek-vl2-pro", "DeepSeek", 890, 0.95, 32, error_rate=0.14)
    else:
        return GeneralMultimodalBaseline(model_name, "Community", 1100, 1.20, 30, error_rate=0.18)
