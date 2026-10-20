"""
Unit & Integration Test Suite for StarLife-1-WSV Evaluation Pipeline
"""

import unittest
from openwsv_eval.core.types import (
    WorldEntity,
    TopologyEdge,
    WorldEvent,
    BoundingBox3D,
    RelationType,
    EventType,
    GatingTelemetry,
    GatingStage,
)
from openwsv_eval.verifiers.topology_verifier import SpatialTopologyVerifier
from openwsv_eval.verifiers.temporal_verifier import TemporalEventVerifier
from openwsv_eval.verifiers.affordance_verifier import AffordanceCollisionVerifier
from openwsv_eval.verifiers.gating_verifier import GatingEfficiencyVerifier
from openwsv_eval.models.starlife import StarLifeWorldModel
from openwsv_eval.dataset.loader import BenchmarkDatasetLoader
from openwsv_eval.runner.executor import BenchmarkExecutor


class TestStarLifePipeline(unittest.TestCase):
    def setUp(self):
        self.topology_verifier = SpatialTopologyVerifier()
        self.temporal_verifier = TemporalEventVerifier()
        self.affordance_verifier = AffordanceCollisionVerifier()
        self.gating_verifier = GatingEfficiencyVerifier()
        self.loader = BenchmarkDatasetLoader()
        self.executor = BenchmarkExecutor()

    def test_topology_verifier(self):
        gt_edges = [
            TopologyEdge("cup", "table", RelationType.ON),
            TopologyEdge("cup", "bottle", RelationType.OCCLUDES, camera_view="cam_01"),
        ]
        pred_edges = [
            TopologyEdge("cup", "table", RelationType.ON),
            TopologyEdge("cup", "bottle", RelationType.OCCLUDES, camera_view="cam_01"),
        ]
        res = self.topology_verifier.verify_topology_graph(pred_edges, gt_edges)
        self.assertTrue(res["passed"])
        self.assertEqual(res["f1"], 1.0)

        # Test Mutual Exclusivity Violation
        violating_edges = [
            TopologyEdge("apple", "box", RelationType.INSIDE),
            TopologyEdge("apple", "desk", RelationType.ON),
        ]
        res_v = self.topology_verifier.verify_topology_graph(violating_edges, gt_edges)
        self.assertFalse(res_v["passed"])
        self.assertTrue(len(res_v["exclusivity_violations"]) > 0)

    def test_temporal_event_verifier(self):
        events = [
            WorldEvent("ev_1", EventType.APPEARED, 1000, "mug", {"pose": (0, 0, 0)}),
            WorldEvent("ev_2", EventType.MOVED, 1050, "mug", {"pose": (1, 0, 0)}),
            WorldEvent("ev_3", EventType.RELATION_CHANGED, 1100, "mug", {"target": "tray"}),
        ]
        res = self.temporal_verifier.verify_event_stream(events, events)
        self.assertTrue(res["passed"])
        self.assertEqual(res["accuracy"], 1.0)

    def test_affordance_collision(self):
        start = (0.0, 0.0, 0.20)
        end = (0.30, 0.0, 0.20)
        obstacle = {"prism": BoundingBox3D((0.15, 0.0, 0.20), (0.08, 0.08, 0.15))}

        # Trajectory goes directly through obstacle -> Must be INFEASIBLE
        res = self.affordance_verifier.verify_gripper_path(
            start, end, obstacle, predicted_decision="INFEASIBLE", predicted_obstacle_id="prism"
        )
        self.assertTrue(res["passed"])
        self.assertFalse(res["actual_feasible"])

    def test_starlife_gating_efficiency(self):
        telemetry = GatingTelemetry(
            total_frames=100,
            stage_0_fsm_suppressed=38,
            stage_1_ssim_suppressed=32,
            vlm_invocations=30,
            cache_hit_rate=0.70,
            avg_latency_ms=18.5,
            total_compute_flops_savings=0.70,
        )
        actual_mutations = [12, 45, 88]
        # Simulate decisions with PASS_THROUGH at actual mutations
        decisions = [GatingStage.CACHE_HIT] * 100
        for idx in actual_mutations:
            decisions[idx] = GatingStage.PASS_THROUGH
        # Add a couple spurious wakeups
        decisions[20] = GatingStage.PASS_THROUGH

        res = self.gating_verifier.verify_gating_performance(
            telemetry, actual_mutations, decisions
        )
        self.assertTrue(res["passed"])
        self.assertGreaterEqual(res["cache_hit_rate"], 0.65)
        self.assertEqual(res["mutation_recall"], 1.0)

    def test_full_starlife_model_benchmark(self):
        scenarios = self.loader.load_benchmark_suite()
        starlife = StarLifeWorldModel(model_id="starlife-1-wsv")
        summary = self.executor.run_benchmark(starlife, scenarios)

        self.assertEqual(summary["model_id"], "starlife-1-wsv")
        self.assertEqual(summary["provider"], "StarLife AI")
        self.assertGreaterEqual(summary["pass_rate_pct"], 80.0)
        self.assertGreaterEqual(summary["cache_hit_rate_pct"], 65.0)


if __name__ == "__main__":
    unittest.main()
