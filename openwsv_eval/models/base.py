"""
OpenWSV Base Multimodal Model Adapter Interface
"""

from abc import ABC, abstractmethod
from typing import Dict, Any
from ..core.task import TaskScenario, ModelEvaluationOutput


class BaseMultimodalModel(ABC):
    def __init__(self, model_id: str, provider: str, mode: str = "HIGH"):
        self.model_id = model_id
        self.provider = provider
        self.mode = mode

    @abstractmethod
    def evaluate_scenario(self, scenario: TaskScenario) -> ModelEvaluationOutput:
        """
        Takes a multimodal scenario (RGB-D views, video streams, 3D pointcloud, prompt)
        and returns the model's predicted world state, topology, and decisions.
        """
        pass
