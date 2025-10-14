"""
Database service for managing database operations.
"""

import structlog
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional, List, Dict, Any
import os

from models import Base, Model, Benchmark, Run, Result, Comparison, User
from config import get_settings

logger = structlog.get_logger(__name__)

class DatabaseService:
    """Service for database operations."""
    
    def __init__(self):
        """Initialize database service."""
        self.settings = get_settings()
        self.engine = None
        self.SessionLocal = None
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize database connection."""
        try:
            # Use Supabase connection string
            database_url = self.settings.database_url
            if not database_url:
                # Fallback to local database for development
                database_url = "postgresql://localhost/lmms_eval_dashboard"
            
            self.engine = create_engine(
                database_url,
                pool_pre_ping=True,
                pool_recycle=300,
                echo=False
            )
            
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
            logger.info("Database connection initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize database", error=str(e))
            raise
    
    def get_session(self) -> Session:
        """Get database session."""
        return self.SessionLocal()
    
    def create_tables(self):
        """Create database tables."""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error("Failed to create tables", error=str(e))
            raise
    
    def health_check(self) -> bool:
        """Check database health."""
        try:
            with self.get_session() as session:
                session.execute(text("SELECT 1"))
                return True
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
            return False
    
    # Model operations
    def create_model(self, model_data: Dict[str, Any]) -> Model:
        """Create a new model."""
        with self.get_session() as session:
            try:
                model = Model(**model_data)
                session.add(model)
                session.commit()
                session.refresh(model)
                logger.info("Model created successfully", model_id=str(model.id))
                return model
            except Exception as e:
                session.rollback()
                logger.error("Failed to create model", error=str(e))
                raise
    
    def get_models(self, skip: int = 0, limit: int = 100) -> List[Model]:
        """Get all models."""
        with self.get_session() as session:
            return session.query(Model).offset(skip).limit(limit).all()
    
    def get_model_by_id(self, model_id: str) -> Optional[Model]:
        """Get model by ID."""
        with self.get_session() as session:
            return session.query(Model).filter(Model.id == model_id).first()
    
    # Benchmark operations
    def create_benchmark(self, benchmark_data: Dict[str, Any]) -> Benchmark:
        """Create a new benchmark."""
        with self.get_session() as session:
            try:
                benchmark = Benchmark(**benchmark_data)
                session.add(benchmark)
                session.commit()
                session.refresh(benchmark)
                logger.info("Benchmark created successfully", benchmark_id=str(benchmark.id))
                return benchmark
            except Exception as e:
                session.rollback()
                logger.error("Failed to create benchmark", error=str(e))
                raise
    
    def get_benchmarks(self, skip: int = 0, limit: int = 100) -> List[Benchmark]:
        """Get all benchmarks."""
        with self.get_session() as session:
            return session.query(Benchmark).offset(skip).limit(limit).all()
    
    def get_benchmark_by_id(self, benchmark_id: str) -> Optional[Benchmark]:
        """Get benchmark by ID."""
        with self.get_session() as session:
            return session.query(Benchmark).filter(Benchmark.id == benchmark_id).first()
    
    # Run operations
    def create_run(self, run_data: Dict[str, Any]) -> Run:
        """Create a new run."""
        with self.get_session() as session:
            try:
                run = Run(**run_data)
                session.add(run)
                session.commit()
                session.refresh(run)
                logger.info("Run created successfully", run_id=str(run.id))
                return run
            except Exception as e:
                session.rollback()
                logger.error("Failed to create run", error=str(e))
                raise
    
    def get_runs(self, skip: int = 0, limit: int = 100) -> List[Run]:
        """Get all runs."""
        with self.get_session() as session:
            return session.query(Run).offset(skip).limit(limit).all()
    
    def get_run_by_id(self, run_id: str) -> Optional[Run]:
        """Get run by ID."""
        with self.get_session() as session:
            return session.query(Run).filter(Run.id == run_id).first()
    
    def update_run_status(self, run_id: str, status: str, **kwargs) -> Optional[Run]:
        """Update run status."""
        with self.get_session() as session:
            try:
                run = session.query(Run).filter(Run.id == run_id).first()
                if run:
                    run.status = status
                    for key, value in kwargs.items():
                        setattr(run, key, value)
                    session.commit()
                    session.refresh(run)
                    logger.info("Run status updated", run_id=run_id, status=status)
                    return run
                return None
            except Exception as e:
                session.rollback()
                logger.error("Failed to update run status", error=str(e))
                raise
    
    # Result operations
    def create_result(self, result_data: Dict[str, Any]) -> Result:
        """Create a new result."""
        with self.get_session() as session:
            try:
                result = Result(**result_data)
                session.add(result)
                session.commit()
                session.refresh(result)
                logger.info("Result created successfully", result_id=str(result.id))
                return result
            except Exception as e:
                session.rollback()
                logger.error("Failed to create result", error=str(e))
                raise
    
    def get_results_by_run_id(self, run_id: str) -> List[Result]:
        """Get results by run ID."""
        with self.get_session() as session:
            return session.query(Result).filter(Result.run_id == run_id).all()

# Global database service instance
db_service = DatabaseService()
