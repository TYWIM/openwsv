"""
OpenWSV Task Scenario Definition & Ground-Truth Schema
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from .types import WorldStateSnapshot, TopologyEdge, RelationType


@dataclass
class CameraCalib:
    cam_id: str
    intrinsics: List[List[float]]          # 3x3 matrix
    extrinsics: List[List[float]]          # 4x4 matrix
    resolution: tuple = (1920, 1080)
    has_depth: bool = True


@dataclass
class TaskScenario:
    task_id: str
    title: str
    category: str                          # "clutter_occlusion", "reachability_affordance", "temporal_constancy", "equilibrium_stability"
    difficulty: str                        # "Standard", "Hard", "Extreme"
    modality: str                          # "RGB-D", "Multi-view", "Video Stream", "3D Pointcloud"
    cameras: List[CameraCalib]
    input_frames: Dict[str, Any]           # multi-view image/depth/pointcloud tensors
    prompt: str                            # Query to the multimodal model
    expected_output_type: str              # "TOPOLOGY_DAG", "COLLISION_MANIFOLD", "TIME_TRAVEL_STATE", "EQUILIBRIUM_FLAG"
    ground_truth_state: WorldStateSnapshot
    verification_rules: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ModelEvaluationOutput:
    task_id: str
    model_id: str
    raw_response: str
    predicted_state: Optional[WorldStateSnapshot] = None
    predicted_edges: List[TopologyEdge] = field(default_factory=list)
    predicted_decision: Optional[str] = None
    gating_telemetry: Optional[Dict[str, Any]] = None
    latency_ms: float = 0.0
    tokens_consumed: int = 0
    estimated_cost_usd: float = 0.0
