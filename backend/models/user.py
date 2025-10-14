"""
User database model.
"""

from sqlalchemy import Column, String, Boolean, JSON
from .base import BaseModel

class User(BaseModel):
    """Model for storing user information."""
    __tablename__ = "users"
    
    email = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    preferences = Column(JSON, default=dict)
    
    def to_dict(self):
        """Convert user to dictionary."""
        return {
            "id": str(self.id),
            "email": self.email,
            "name": self.name,
            "is_active": self.is_active,
            "preferences": self.preferences,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
