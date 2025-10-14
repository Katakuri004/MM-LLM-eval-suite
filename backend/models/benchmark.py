"""
Benchmark database model.
"""

from sqlalchemy import Column, String, Integer, Text, JSON
from .base import BaseModel

class Benchmark(BaseModel):
    """Model for storing benchmark information."""
    __tablename__ = "benchmarks"
    
    name = Column(String, nullable=False, unique=True)
    modality = Column(String, nullable=False)
    category = Column(String, nullable=False)
    task_type = Column(String, nullable=False)
    primary_metrics = Column(JSON, default=list)
    secondary_metrics = Column(JSON, default=list)
    num_samples = Column(Integer, nullable=False)
    description = Column(Text)
    
    def to_dict(self):
        """Convert benchmark to dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "modality": self.modality,
            "category": self.category,
            "task_type": self.task_type,
            "primary_metrics": self.primary_metrics,
            "secondary_metrics": self.secondary_metrics,
            "num_samples": self.num_samples,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
