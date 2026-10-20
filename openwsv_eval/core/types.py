"""
OpenWSV Core Domain Types
Aligned with StarLife-1-WSV World Model Architecture:
- Event-Sourcing World Graph & Atomic Physical Events
- 3D Spatial Topology (ON, INSIDE, OCCLUDES, PROXIMATE)
- Two-Stage Cascaded Settlement Gating (Stage 0 FSM + Stage 1 SSIM)
- Model Context Protocol (MCP) Standard Output Schema
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
import time


class RelationType(str, Enum):
    ON = "ON"                      # Gravity support: A rests on B
    INSIDE = "INSIDE"              # Enclosure: A is inside container B
    OCCLUDES = "OCCLUDES"          # Visual LOS occlusion: A occludes B from camera viewpoint
    PROXIMATE = "PROXIMATE"        # Euclidean proximity under threshold
    ADJACENT = "ADJACENT"          # Topological corridor/navigable connectivity
    CLEAR_OF = "CLEAR_OF"          # Collision-free free space


class EventType(str, Enum):
    APPEARED = "APPEARED"                  # Entity introduced to world
    MOVED = "MOVED"                        # Entity 3D position mutated
    RELATION_CHANGED = "RELATION_CHANGED"  # Topological relation transition
    DISAPPEARED = "DISAPPEARED"            # Entity removed or occluded permanently


class GatingStage(str, Enum):
    STAGE_0_SETTLEMENT = "STAGE_0_SETTLEMENT"  # Motion settlement FSM (eliminates motion blur)
    STAGE_1_SSIM_VARIANCE = "STAGE_1_SSIM_VARIANCE"  # Patch SSIM structural variance
    PASS_THROUGH = "PASS_THROUGH"              # Physical mutation occurred -> Wake up VLM
    CACHE_HIT = "CACHE_HIT"                    # Static scene -> Reuse Prompt Cache (>65%)


@dataclass
class BoundingBox3D:
    center: Tuple[float, float, float]    # (x, y, z) in meters
    extents: Tuple[float, float, float]   # (dx, dy, dz) bounding dimensions
    yaw_pitch_roll: Tuple[float, float, float] = (0.0, 0.0, 0.0)

    def volume(self) -> float:
        return self.extents[0] * self.extents[1] * self.extents[2]


@dataclass
class WorldEntity:
    entity_id: str                         # Global invariant persistent entity ID
    category: str                          # e.g., "coffee_mug", "robot_gripper", "desktop"
    bbox_3d: BoundingBox3D
    confidence: float = 1.0
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TopologyEdge:
    source_id: str
    target_id: str
    relation: RelationType
    confidence: float = 1.0
    camera_view: Optional[str] = None      # Viewpoint identifier for occlusion relations


@dataclass
class WorldEvent:
    event_id: str
    event_type: EventType
    timestamp_ms: int
    entity_id: str
    payload: Dict[str, Any]
    source_camera: str = "cam_0"


@dataclass
class WorldStateSnapshot:
    """
    Immutable World State snapshot at a discrete timestamp T.
    Produced by the StarLife-1-WSV Single-Writer Event-Sourcing Engine.
    """
    timestamp_ms: int
    entities: Dict[str, WorldEntity]
    topology_edges: List[TopologyEdge]
    event_log: List[WorldEvent] = field(default_factory=list)
    gating_status: GatingStage = GatingStage.PASS_THROUGH
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_relations_for(self, entity_id: str) -> List[TopologyEdge]:
        return [
            e for e in self.topology_edges
            if e.source_id == entity_id or e.target_id == entity_id
        ]


@dataclass
class GatingTelemetry:
    """
    Measures efficiency of StarLife's Two-Stage Cascaded Settlement Gating.
    """
    total_frames: int
    stage_0_fsm_suppressed: int      # Suppressed due to active motion blur / transient movement
    stage_1_ssim_suppressed: int     # Suppressed due to lighting/shadow jitter
    vlm_invocations: int             # Actually woken up for dual-baseline difference reasoning
    cache_hit_rate: float            # Percentage of frames avoiding expensive VLM calls (target >65%)
    avg_latency_ms: float
    total_compute_flops_savings: float
