"""
OpenWSV Temporal Event & State Transition Verifier
Evaluates StarLife's Event-Sourced WorldStore:
- Atomic Event Stream Continuity (APPEARED -> MOVED -> RELATION_CHANGED -> DISAPPEARED)
- Time-Travel State Reconstruction at Timestamp T
- Object Constancy & Global Invariant Entity ID Persistence
"""

from typing import List, Dict, Any, Optional
from ..core.types import WorldEvent, EventType, WorldStateSnapshot


class TemporalEventVerifier:
    """
    Verifies temporal consistency, causality preservation, and event log integrity.
    """

    def verify_event_stream(
        self,
        event_log: List[WorldEvent],
        expected_events: List[WorldEvent]
    ) -> Dict[str, Any]:
        """
        Validates the event log against temporal invariants:
        1. Monotonically non-decreasing timestamps
        2. No MOVED or RELATION_CHANGED before APPEARED
        3. No events after DISAPPEARED unless re-APPEARED
        """
        if not event_log:
            return {"passed": len(expected_events) == 0, "error": "Event log is empty"}

        violations = []
        entity_lifecycles: Dict[str, str] = {}
        last_ts = -1

        for ev in event_log:
            # 1. Monotonicity check
            if ev.timestamp_ms < last_ts:
                violations.append(
                    f"Timestamp retrograde: event {ev.event_id} at {ev.timestamp_ms}ms occurred after {last_ts}ms"
                )
            last_ts = ev.timestamp_ms

            # 2. Lifecycle sequence check
            current_state = entity_lifecycles.get(ev.entity_id, "UNBORN")

            if ev.event_type == EventType.APPEARED:
                if current_state == "ACTIVE":
                    violations.append(f"Entity {ev.entity_id} sent duplicate APPEARED while already ACTIVE")
                entity_lifecycles[ev.entity_id] = "ACTIVE"

            elif ev.event_type in (EventType.MOVED, EventType.RELATION_CHANGED):
                if current_state != "ACTIVE":
                    violations.append(
                        f"Entity {ev.entity_id} performed {ev.event_type.value} while in state {current_state}"
                    )

            elif ev.event_type == EventType.DISAPPEARED:
                if current_state != "ACTIVE":
                    violations.append(
                        f"Entity {ev.entity_id} sent DISAPPEARED while in state {current_state}"
                    )
                entity_lifecycles[ev.entity_id] = "DISAPPEARED"

        # Compare with expected events
        expected_types = [(e.entity_id, e.event_type.value) for e in expected_events]
        actual_types = [(e.entity_id, e.event_type.value) for e in event_log]

        matched = sum(1 for e in expected_types if e in actual_types)
        accuracy = matched / len(expected_types) if expected_types else 1.0

        passed = (len(violations) == 0) and (accuracy >= 0.8)

        return {
            "passed": passed,
            "accuracy": round(accuracy, 4),
            "matched_events": matched,
            "total_expected": len(expected_types),
            "violations": violations,
            "lifecycle_summary": entity_lifecycles,
        }

    def verify_time_travel_query(
        self,
        predicted_state_at_t: WorldStateSnapshot,
        ground_truth_state_at_t: WorldStateSnapshot,
        query_timestamp: int
    ) -> Dict[str, Any]:
        """
        Verifies that querying the world state at arbitrary timestamp T returns the exact
        entities and relations present at that historical moment.
        """
        pred_entities = set(predicted_state_at_t.entities.keys())
        gt_entities = set(ground_truth_state_at_t.entities.keys())

        entity_iou = len(pred_entities.intersection(gt_entities)) / len(pred_entities.union(gt_entities)) if gt_entities else 1.0

        # Coordinate error for persistent entities
        coord_errors = []
        for eid in pred_entities.intersection(gt_entities):
            p_pos = predicted_state_at_t.entities[eid].bbox_3d.center
            g_pos = ground_truth_state_at_t.entities[eid].bbox_3d.center
            dist = sum((a - b) ** 2 for a, b in zip(p_pos, g_pos)) ** 0.5
            coord_errors.append(dist)

        mean_coord_error = sum(coord_errors) / len(coord_errors) if coord_errors else 0.0

        passed = (entity_iou >= 0.85) and (mean_coord_error <= 0.15)  # <= 15cm error in 3D space

        return {
            "query_timestamp_ms": query_timestamp,
            "passed": passed,
            "entity_iou": round(entity_iou, 4),
            "mean_coord_error_m": round(mean_coord_error, 4),
            "entities_found": list(pred_entities),
            "entities_expected": list(gt_entities),
        }
