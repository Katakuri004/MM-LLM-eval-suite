"""
Supabase service for managing database operations.
"""

import structlog
from supabase import create_client, Client
from typing import Optional, List, Dict, Any
import os
from datetime import datetime

from config import get_settings

logger = structlog.get_logger(__name__)

class SupabaseService:
    """Service for Supabase operations."""
    
    def __init__(self):
        """Initialize Supabase service."""
        self.settings = get_settings()
        self.client: Optional[Client] = None
        self._initialize_supabase()
    
    def _initialize_supabase(self):
        """Initialize Supabase client."""
        try:
            if not self.settings.supabase_url or not self.settings.supabase_key:
                logger.warning("Supabase credentials not provided, running in limited mode")
                self.client = None
                return
            
            # Create client with minimal configuration
            self.client = create_client(
                self.settings.supabase_url,
                self.settings.supabase_key
            )
            
            logger.info("Supabase client initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize Supabase", error=str(e))
            logger.warning("Running in limited mode without Supabase")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if Supabase is available."""
        return self.client is not None
    
    def health_check(self) -> bool:
        """Check Supabase health."""
        if not self.is_available():
            return False
        
        try:
            # Try a simple query to test connection
            result = self.client.table('models').select('id').limit(1).execute()
            return True
        except Exception as e:
            logger.error("Supabase health check failed", error=str(e))
            return False
    
    # Model operations
    def create_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new model."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            # Add timestamps
            model_data['created_at'] = datetime.utcnow().isoformat()
            
            result = self.client.table('models').insert(model_data).execute()
            
            if result.data:
                logger.info("Model created successfully", model_id=result.data[0]['id'])
                return result.data[0]
            else:
                raise RuntimeError("Failed to create model")
                
        except Exception as e:
            logger.error("Failed to create model", error=str(e))
            raise
    
    def get_models(
        self,
        skip: int = 0,
        limit: int = 25,
        q: Optional[str] = None,
        family: Optional[str] = None,
        sort: Optional[str] = None,
        lean: bool = True,
    ) -> Dict[str, Any]:
        """Get models with pagination and optional filters.

        Returns a dictionary with keys: { 'items': List[models], 'total': int }
        """
        if not self.is_available():
            return {"items": [], "total": 0}

        try:
            # Lean selection excludes heavy JSON fields to speed up list views
            columns = (
                "id,name,family,source,dtype,num_parameters,created_at"
                if lean
                else "*"
            )

            query = self.client.table('models').select(columns, count='exact')

            if q:
                # Case-insensitive partial match on name or family
                query = query.or_(f"name.ilike.%{q}%,family.ilike.%{q}%")
            if family:
                query = query.ilike('family', f'%{family}%')

            # Sorting: support created_at desc by default
            if sort:
                # Expected format: "field:asc" or "field:desc"
                try:
                    field, direction = sort.split(':')
                    query = query.order(field, desc=(direction.lower() == 'desc'))
                except Exception:
                    query = query.order('created_at', desc=True)
            else:
                query = query.order('created_at', desc=True)

            result = query.range(skip, skip + limit - 1).execute()

            items = result.data or []
            total = getattr(result, 'count', None)
            # Some client versions attach count on result.count, otherwise re-count cheaply when small
            if total is None:
                total = len(items)

            return {"items": items, "total": total}
        except Exception as e:
            logger.error("Failed to get models", error=str(e))
            return {"items": [], "total": 0}
    
    def get_model_by_id(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get model by ID."""
        if not self.is_available():
            return None
        
        try:
            result = self.client.table('models').select('*').eq('id', model_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error("Failed to get model", model_id=model_id, error=str(e))
            return None
    
    # Benchmark operations
    def create_benchmark(self, benchmark_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new benchmark."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            # Add timestamps
            benchmark_data['created_at'] = datetime.utcnow().isoformat()
            
            result = self.client.table('benchmarks').insert(benchmark_data).execute()
            
            if result.data:
                logger.info("Benchmark created successfully", benchmark_id=result.data[0]['id'])
                return result.data[0]
            else:
                raise RuntimeError("Failed to create benchmark")
                
        except Exception as e:
            logger.error("Failed to create benchmark", error=str(e))
            raise
    
    def get_benchmarks(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all benchmarks."""
        if not self.is_available():
            return []
        
        try:
            result = self.client.table('benchmarks').select('*').range(skip, skip + limit - 1).execute()
            return result.data or []
        except Exception as e:
            logger.error("Failed to get benchmarks", error=str(e))
            return []
    
    def get_benchmark_by_id(self, benchmark_id: str) -> Optional[Dict[str, Any]]:
        """Get benchmark by ID."""
        if not self.is_available():
            return None
        
        try:
            result = self.client.table('benchmarks').select('*').eq('id', benchmark_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error("Failed to get benchmark", benchmark_id=benchmark_id, error=str(e))
            return None
    
    # Run operations
    def create_run(self, run_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new run."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            # Add timestamps
            run_data['created_at'] = datetime.utcnow().isoformat()
            
            result = self.client.table('runs').insert(run_data).execute()
            
            if result.data:
                logger.info("Run created successfully", run_id=result.data[0]['id'])
                return result.data[0]
            else:
                raise RuntimeError("Failed to create run")
                
        except Exception as e:
            logger.error("Failed to create run", error=str(e))
            raise
    
    def get_runs(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all runs."""
        if not self.is_available():
            return []
        
        try:
            result = self.client.table('runs').select('*').range(skip, skip + limit - 1).execute()
            return result.data or []
        except Exception as e:
            logger.error("Failed to get runs", error=str(e))
            return []
    
    def get_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get run by ID."""
        if not self.is_available():
            return None
        
        try:
            result = self.client.table('runs').select('*').eq('id', run_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error("Failed to get run", run_id=run_id, error=str(e))
            return None
    
    def update_run_status(self, run_id: str, status: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update run status."""
        if not self.is_available():
            return None
        
        try:
            update_data = {'status': status}
            update_data.update(kwargs)
            
            result = self.client.table('runs').update(update_data).eq('id', run_id).execute()
            
            if result.data:
                logger.info("Run status updated", run_id=run_id, status=status)
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error("Failed to update run status", error=str(e))
            return None
    
    # Result operations
    def create_result(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new result."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            # Add timestamps
            result_data['created_at'] = datetime.utcnow().isoformat()
            
            result = self.client.table('results').insert(result_data).execute()
            
            if result.data:
                logger.info("Result created successfully", result_id=result.data[0]['id'])
                return result.data[0]
            else:
                raise RuntimeError("Failed to create result")
                
        except Exception as e:
            logger.error("Failed to create result", error=str(e))
            raise
    
    def get_results_by_run_id(self, run_id: str) -> List[Dict[str, Any]]:
        """Get results by run ID."""
        if not self.is_available():
            return []
        
        try:
            result = self.client.table('results').select('*').eq('run_id', run_id).execute()
            return result.data or []
        except Exception as e:
            logger.error("Failed to get results", run_id=run_id, error=str(e))
            return []
    
    def update_model_validation_status(self, model_id: str, status: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update model validation status."""
        if not self.is_available():
            return None
        
        try:
            update_data = {
                'validation_status': status,
            }
            update_data.update(kwargs)
            
            result = self.client.table('models').update(update_data).eq('id', model_id).execute()
            
            if result.data:
                logger.info("Model validation status updated", model_id=model_id, status=status)
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error("Failed to update model validation status", error=str(e))
            return None

# Global Supabase service instance
supabase_service = SupabaseService()
