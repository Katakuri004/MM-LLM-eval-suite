"""
Run database model.
"""

from sqlalchemy import Column, String, Text, JSON, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import BaseModel
import enum

class RunStatus(enum.Enum):
    """Run status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Run(BaseModel):
    """Model for storing evaluation runs."""
    __tablename__ = "runs"
    
    name = Column(String, nullable=False)
    model_id = Column(UUID(as_uuid=True), ForeignKey("models.id"), nullable=False)
    checkpoint_variant = Column(String, default="latest")
    benchmark_id = Column(UUID(as_uuid=True), ForeignKey("benchmarks.id"), nullable=False)
    status = Column(Enum(RunStatus), default=RunStatus.PENDING)
    config = Column(JSON, default=dict)
    results = Column(JSON, default=dict)
    logs = Column(Text)
    error_message = Column(Text)
    started_at = Column(String)
    completed_at = Column(String)
    duration_seconds = Column(String)
    
    # Relationships
    model = relationship("Model")
    benchmark = relationship("Benchmark")
    
    def to_dict(self):
        """Convert run to dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "model_id": str(self.model_id),
            "checkpoint_variant": self.checkpoint_variant,
            "benchmark_id": str(self.benchmark_id),
            "status": self.status.value if self.status else None,
            "config": self.config,
            "results": self.results,
            "logs": self.logs,
            "error_message": self.error_message,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "duration_seconds": self.duration_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
