"""
Result database model.
"""

from sqlalchemy import Column, String, Float, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import BaseModel

class Result(BaseModel):
    """Model for storing evaluation results."""
    __tablename__ = "results"
    
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id"), nullable=False)
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    metric_type = Column(String, nullable=False)  # primary, secondary, custom
    result_metadata = Column(JSON, default=dict)
    
    # Relationships
    run = relationship("Run")
    
    def to_dict(self):
        """Convert result to dictionary."""
        return {
            "id": str(self.id),
            "run_id": str(self.run_id),
            "metric_name": self.metric_name,
            "metric_value": self.metric_value,
            "metric_type": self.metric_type,
            "metadata": self.result_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
