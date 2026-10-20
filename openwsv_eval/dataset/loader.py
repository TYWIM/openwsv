"""
OpenWSV Dataset & Benchmark Scenario Loader
Generates and loads procedural contamination-free benchmark tasks.
"""

from typing import List, Dict, Any, Optional
from ..core.task import TaskScenario, CameraCalib
from ..core.types import (
    WorldStateSnapshot,
    WorldEntity,
    TopologyEdge,
    WorldEvent,
    BoundingBox3D,
    RelationType,
    EventType,
)


class BenchmarkDatasetLoader:
    def __init__(self, data_root: Optional[str] = None):
        self.data_root = data_root

    def load_benchmark_suite(self, limit: Optional[int] = None) -> List[TaskScenario]:
        """
        Loads the benchmark evaluation scenarios.
        """
        scenarios = self._build_canonical_scenarios()
        if limit:
            return scenarios[:limit]
        return scenarios

    def _build_canonical_scenarios(self) -> List[TaskScenario]:
        scenarios = []

        # 1. Kitchen Dense Clutter: Occlusion DAG
        entities_1 = {
            "cup_blue": WorldEntity("cup_blue", "mug", BoundingBox3D((0.15, 0.45, 0.85), (0.1, 0.1, 0.12))),
            "bottle_green": WorldEntity("bottle_green", "bottle", BoundingBox3D((0.18, 0.46, 0.90), (0.08, 0.08, 0.25))),
            "box_cereal": WorldEntity("box_cereal", "container", BoundingBox3D((0.25, 0.50, 0.95), (0.18, 0.08, 0.30))),
            "countertop": WorldEntity("countertop", "surface", BoundingBox3D((0.0, 0.50, 0.75), (1.2, 0.8, 0.05))),
        }
        edges_1 = [
            TopologyEdge("cup_blue", "countertop", RelationType.ON),
            TopologyEdge("bottle_green", "countertop", RelationType.ON),
            TopologyEdge("box_cereal", "countertop", RelationType.ON),
            TopologyEdge("cup_blue", "bottle_green", RelationType.OCCLUDES, camera_view="cam_01"),
            TopologyEdge("bottle_green", "box_cereal", RelationType.OCCLUDES, camera_view="cam_01"),
        ]
        scenarios.append(
            TaskScenario(
                task_id="openwsv-clutter-01",
                title="Occlusion Graph Recovery under Non-Convex Clutter",
                category="clutter_occlusion",
                difficulty="Extreme",
                modality="Multi-view",
                cameras=[
                    CameraCalib("cam_01", [[800, 0, 960], [0, 800, 540], [0, 0, 1]], [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]),
                    CameraCalib("cam_02", [[800, 0, 960], [0, 800, 540], [0, 0, 1]], [[0,1,0,0],[-1,0,0,0],[0,0,1,0],[0,0,0,1]]),
                ],
                input_frames={"views": ["cam_01.png", "cam_02.png"]},
                prompt="Reconstruct the complete directed line-of-sight occlusion DAG for all interacting items from Cam_01 viewpoint.",
                expected_output_type="TOPOLOGY_DAG",
                ground_truth_state=WorldStateSnapshot(1000, entities_1, edges_1),
                verification_rules={"require_dag": True, "min_f1": 0.80}
            )
        )

        # 2. Franka Manipulation: Collision & Reachability
        entities_2 = {
            "target_cylinder": WorldEntity("target_cylinder", "object", BoundingBox3D((0.30, 0.0, 0.20), (0.06, 0.06, 0.15))),
            "intervening_prism": WorldEntity("intervening_prism", "obstacle", BoundingBox3D((0.18, 0.0, 0.22), (0.12, 0.12, 0.18))),
            "workbench": WorldEntity("workbench", "surface", BoundingBox3D((0.30, 0.0, 0.0), (1.0, 1.0, 0.1))),
        }
        edges_2 = [
            TopologyEdge("target_cylinder", "workbench", RelationType.ON),
            TopologyEdge("intervening_prism", "workbench", RelationType.ON),
        ]
        scenarios.append(
            TaskScenario(
                task_id="openwsv-reach-02",
                title="Embodied 6-DoF Reachability & Collision Prediction",
                category="reachability_affordance",
                difficulty="Hard",
                modality="RGB-D",
                cameras=[CameraCalib("cam_gripper", [[600,0,320],[0,600,240],[0,0,1]], [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]])],
                input_frames={"rgb": "gripper_rgb.png", "depth": "gripper_depth.png"},
                prompt="Given the approach trajectory along vector [0.12, 0.0, 0.0], is reaching target_cylinder collision-free?",
                expected_output_type="COLLISION_MANIFOLD",
                ground_truth_state=WorldStateSnapshot(2000, entities_2, edges_2),
                verification_rules={
                    "start_pose": (0.0, 0.0, 0.22),
                    "end_pose": (0.30, 0.0, 0.20),
                    "expected_decision": "INFEASIBLE",
                    "critical_obstacle": "intervening_prism"
                }
            )
        )

        # 3. Dynamic State Tracking across 180° Swivel
        entities_3 = {
            "notebook_blue": WorldEntity("notebook_blue", "stationery", BoundingBox3D((0.40, -0.20, 0.78), (0.22, 0.15, 0.02))),
            "desk_wood": WorldEntity("desk_wood", "furniture", BoundingBox3D((0.40, 0.0, 0.74), (0.80, 1.2, 0.04))),
        }
        edges_3 = [TopologyEdge("notebook_blue", "desk_wood", RelationType.ON)]
        events_3 = [
            WorldEvent("ev_1", EventType.APPEARED, 1000, "notebook_blue", {"pose": (0.40, -0.20, 0.78)}),
            WorldEvent("ev_2", EventType.RELATION_CHANGED, 1050, "notebook_blue", {"relation": "ON", "target": "desk_wood"}),
        ]
        scenarios.append(
            TaskScenario(
                task_id="openwsv-temporal-03",
                title="Dynamic State Tracking across 180° Camera Swivel",
                category="temporal_constancy",
                difficulty="Extreme",
                modality="Video Stream",
                cameras=[CameraCalib("cam_ego", [[750,0,640],[0,750,360],[0,0,1]], [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]])],
                input_frames={"video_frames": 120},
                prompt="Track notebook_blue identity and 3D pose after the 180-degree blind camera rotation.",
                expected_output_type="TIME_TRAVEL_STATE",
                ground_truth_state=WorldStateSnapshot(3000, entities_3, edges_3, event_log=events_3),
                verification_rules={"query_timestamp": 3000, "max_coord_error": 0.15}
            )
        )

        # 4. Physics Stability & Equilibrium
        entities_4 = {
            "block_a": WorldEntity("block_a", "block", BoundingBox3D((0.0, 0.0, 0.05), (0.20, 0.10, 0.10))),
            "block_b": WorldEntity("block_b", "block", BoundingBox3D((0.08, 0.0, 0.15), (0.20, 0.10, 0.10))),
        }
        edges_4 = [TopologyEdge("block_b", "block_a", RelationType.ON)]
        scenarios.append(
            TaskScenario(
                task_id="openwsv-physics-04",
                title="Contact Physics & Gravity Stability Feasibility",
                category="equilibrium_stability",
                difficulty="Standard",
                modality="Multi-view",
                cameras=[CameraCalib("cam_table", [[650,0,400],[0,650,300],[0,0,1]], [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]])],
                input_frames={"views": ["table_front.png", "table_side.png"]},
                prompt="Block B overhangs Block A by 40% of its length. Is the stack statically stable under gravity?",
                expected_output_type="EQUILIBRIUM_FLAG",
                ground_truth_state=WorldStateSnapshot(4000, entities_4, edges_4),
                verification_rules={
                    "support_polygon_x_range": (-0.10, 0.10),
                    "support_polygon_y_range": (-0.05, 0.05),
                    "center_of_mass": (0.08, 0.0, 0.15),
                    "expected_stable": True
                }
            )
        )

        return scenarios
