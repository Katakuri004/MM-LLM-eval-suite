"""
Model database model.
"""

from sqlalchemy import Column, String, BigInteger, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel

class Model(BaseModel):
    """Model for storing model information."""
    __tablename__ = "models"
    
    name = Column(String, nullable=False, unique=True)
    family = Column(String, nullable=False)
    source = Column(String, nullable=False)
    dtype = Column(String, nullable=False)
    num_parameters = Column(BigInteger, nullable=False)
    notes = Column(Text)
    model_metadata = Column(JSON, default=dict)
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "family": self.family,
            "source": self.source,
            "dtype": self.dtype,
            "num_parameters": self.num_parameters,
            "notes": self.notes,
            "metadata": self.model_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
