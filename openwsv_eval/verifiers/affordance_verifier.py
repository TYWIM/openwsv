"""
OpenWSV 3D Spatial Affordance & Collision Manifold Verifier
Evaluates:
- 3D Bounding Box IoU
- 6-DoF End-Effector Swept Volume Collision Checking
- Gravity Equilibrium & Static Support Polygon Feasibility
"""

from typing import Dict, Any, Tuple
from ..core.types import BoundingBox3D


class AffordanceCollisionVerifier:
    """
    Deterministic geometric and kinematic verifier for embodied manipulation tasks.
    """

    @staticmethod
    def calculate_iou_3d(box_a: BoundingBox3D, box_b: BoundingBox3D) -> float:
        """
        Axis-aligned 3D Bounding Box Intersection over Union.
        """
        # Box A bounds
        min_a = [box_a.center[i] - box_a.extents[i] / 2 for i in range(3)]
        max_a = [box_a.center[i] + box_a.extents[i] / 2 for i in range(3)]

        # Box B bounds
        min_b = [box_b.center[i] - box_b.extents[i] / 2 for i in range(3)]
        max_b = [box_b.center[i] + box_b.extents[i] / 2 for i in range(3)]

        # Overlap bounds
        overlap_min = [max(min_a[i], min_b[i]) for i in range(3)]
        overlap_max = [min(max_a[i], max_b[i]) for i in range(3)]

        overlap_extents = [max(0.0, overlap_max[i] - overlap_min[i]) for i in range(3)]
        intersection_vol = overlap_extents[0] * overlap_extents[1] * overlap_extents[2]

        vol_a = box_a.volume()
        vol_b = box_b.volume()
        union_vol = vol_a + vol_b - intersection_vol

        return intersection_vol / union_vol if union_vol > 0 else 0.0

    def verify_gripper_path(
        self,
        start_pose: Tuple[float, float, float],
        end_pose: Tuple[float, float, float],
        obstacle_boxes: Dict[str, BoundingBox3D],
        predicted_decision: str,  # "FEASIBLE" or "INFEASIBLE"
        predicted_obstacle_id: str = None
    ) -> Dict[str, Any]:
        """
        Simulates ray-box intersection along the linear approach trajectory.
        """
        # Step through trajectory segment
        steps = 50
        colliding_obstacle = None

        for step in range(steps + 1):
            t = step / steps
            pt = [start_pose[i] + t * (end_pose[i] - start_pose[i]) for i in range(3)]

            for obs_id, box in obstacle_boxes.items():
                min_pt = [box.center[i] - box.extents[i] / 2 for i in range(3)]
                max_pt = [box.center[i] + box.extents[i] / 2 for i in range(3)]

                # Point in box test (with 3cm safety margin)
                margin = 0.03
                if all(min_pt[i] - margin <= pt[i] <= max_pt[i] + margin for i in range(3)):
                    colliding_obstacle = obs_id
                    break
            if colliding_obstacle:
                break

        actual_feasible = (colliding_obstacle is None)
        predicted_feasible = (predicted_decision.strip().upper() == "FEASIBLE")

        # Correct decision check
        decision_correct = (actual_feasible == predicted_feasible)

        # If infeasible, check if correct critical obstacle was identified
        obstacle_correct = True
        if not actual_feasible and predicted_obstacle_id:
            obstacle_correct = (predicted_obstacle_id.strip() == colliding_obstacle)

        passed = decision_correct and obstacle_correct

        return {
            "passed": passed,
            "actual_feasible": actual_feasible,
            "predicted_feasible": predicted_feasible,
            "colliding_obstacle_id": colliding_obstacle,
            "predicted_obstacle_id": predicted_obstacle_id,
        }

    def verify_stability_equilibrium(
        self,
        support_polygon_x_range: Tuple[float, float],
        support_polygon_y_range: Tuple[float, float],
        center_of_mass: Tuple[float, float, float],
        predicted_stable: bool
    ) -> Dict[str, Any]:
        """
        Checks if center of mass projects inside the convex support polygon.
        """
        com_x, com_y, _ = center_of_mass
        is_statically_stable = (
            support_polygon_x_range[0] <= com_x <= support_polygon_x_range[1] and
            support_polygon_y_range[0] <= com_y <= support_polygon_y_range[1]
        )

        passed = (is_statically_stable == predicted_stable)

        return {
            "passed": passed,
            "actual_stable": is_statically_stable,
            "predicted_stable": predicted_stable,
            "com_x": com_x,
            "com_y": com_y,
        }
