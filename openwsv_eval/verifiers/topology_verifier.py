"""
OpenWSV Deterministic Spatial Topology Verifier
Evaluates:
- Directed Graph Edge Precision, Recall, and F1
- Topological Occlusion DAG Acyclicity and Sorting
- Mutual Physical Exclusivity Constraints (e.g. INSIDE vs ON)
"""

from typing import List, Tuple, Set, Dict, Any
from ..core.types import TopologyEdge, RelationType, WorldStateSnapshot


class SpatialTopologyVerifier:
    """
    Strict mathematical program-based spatial topology verifier.
    Does not use LLM-as-a-judge; relies on exact relation matching & graph theory.
    """

    @staticmethod
    def _edge_key(edge: TopologyEdge) -> Tuple[str, str, str]:
        return (edge.source_id, edge.target_id, edge.relation.value)

    def verify_topology_graph(
        self,
        predicted_edges: List[TopologyEdge],
        ground_truth_edges: List[TopologyEdge],
    ) -> Dict[str, Any]:
        """
        Calculates Edge Precision, Recall, F1 score, and checks topological constraints.
        """
        pred_set: Set[Tuple[str, str, str]] = {self._edge_key(e) for e in predicted_edges}
        gt_set: Set[Tuple[str, str, str]] = {self._edge_key(e) for e in ground_truth_edges}

        if not gt_set and not pred_set:
            return {"precision": 1.0, "recall": 1.0, "f1": 1.0, "passed": True}

        true_positives = len(pred_set.intersection(gt_set))
        false_positives = len(pred_set - gt_set)
        false_negatives = len(gt_set - pred_set)

        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        # Verify Mutual Exclusivity: An object cannot be simultaneously INSIDE(A, B) and ON(A, C) if B and C are disjoint
        exclusivity_violations = self._check_exclusivity_violations(predicted_edges)

        # Verify Occlusion DAG Acyclicity (A occludes B, B occludes C -> C cannot occlude A from same camera)
        dag_cycles = self._check_occlusion_cycles(predicted_edges)

        passed = (f1 >= 0.75) and (len(exclusivity_violations) == 0) and (not dag_cycles)

        return {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "true_positives": true_positives,
            "false_positives": false_positives,
            "false_negatives": false_negatives,
            "exclusivity_violations": exclusivity_violations,
            "has_dag_cycles": dag_cycles,
            "passed": passed,
        }

    def _check_exclusivity_violations(self, edges: List[TopologyEdge]) -> List[str]:
        violations = []
        containment: Dict[str, str] = {}
        support: Dict[str, str] = {}

        for e in edges:
            if e.relation == RelationType.INSIDE:
                containment[e.source_id] = e.target_id
            elif e.relation == RelationType.ON:
                support[e.source_id] = e.target_id

        # If object A is inside container B, it cannot be supported directly by desk C != B
        for obj_id, container_id in containment.items():
            if obj_id in support and support[obj_id] != container_id:
                violations.append(
                    f"Physical exclusivity violated: {obj_id} is INSIDE {container_id} but also marked ON {support[obj_id]}"
                )

        return violations

    def _check_occlusion_cycles(self, edges: List[TopologyEdge]) -> bool:
        """
        Checks if there are directed cycles in the line-of-sight occlusion relations.
        """
        adj: Dict[str, List[str]] = {}
        for e in edges:
            if e.relation == RelationType.OCCLUDES:
                adj.setdefault(e.source_id, []).append(e.target_id)

        visited = set()
        rec_stack = set()

        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            for neighbor in adj.get(node, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            rec_stack.remove(node)
            return False

        for node in list(adj.keys()):
            if node not in visited:
                if dfs(node):
                    return True
        return False
