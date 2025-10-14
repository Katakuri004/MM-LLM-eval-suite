"""
Comparison database model.
"""

from sqlalchemy import Column, String, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import BaseModel

class Comparison(BaseModel):
    """Model for storing model comparisons."""
    __tablename__ = "comparisons"
    
    name = Column(String, nullable=False)
    run_ids = Column(JSON, nullable=False)  # Array of run IDs
    comparison_data = Column(JSON, default=dict)
    comparison_metadata = Column(JSON, default=dict)
    
    def to_dict(self):
        """Convert comparison to dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "run_ids": self.run_ids,
            "comparison_data": self.comparison_data,
            "metadata": self.comparison_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
