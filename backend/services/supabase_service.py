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
    
    def update_benchmark_task_name(self, benchmark_id: str, task_name: str) -> bool:
        """Update benchmark task name."""
        if not self.is_available():
            return False
        
        try:
            result = self.client.table('benchmarks').update({
                'task_name': task_name
            }).eq('id', benchmark_id).execute()
            
            return len(result.data) > 0
        except Exception as e:
            logger.error("Failed to update benchmark task name", 
                        benchmark_id=benchmark_id, 
                        task_name=task_name, 
                        error=str(e))
            return False
    
    # Run operations
    def create_run(self, run_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new run (alias for create_evaluation)."""
        return self.create_evaluation(run_data)
    
    def get_runs(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all runs (alias for get_evaluations)."""
        return self.get_evaluations(skip=skip, limit=limit)
    
    def get_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get run by ID (alias for get_evaluation)."""
        return self.get_evaluation(run_id)
    
    def update_run_status(self, run_id: str, status: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update run status (alias for update_evaluation)."""
        return self.update_evaluation(run_id, {'status': status, **kwargs})
    
    # Result operations
    def create_result(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new result (alias for create_evaluation_result)."""
        return self.create_evaluation_result(result_data)
    
    def get_results_by_run_id(self, run_id: str) -> List[Dict[str, Any]]:
        """Get results by run ID (alias for get_evaluation_results)."""
        return self.get_evaluation_results(run_id)
    
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
    
    # Evaluation operations
    def create_evaluation(self, evaluation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new evaluation."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            result = self.client.table('evaluations').insert(evaluation_data).execute()
            
            if result.data:
                logger.info("Evaluation created successfully", evaluation_id=result.data[0]['id'])
                return result.data[0]
            else:
                raise RuntimeError("Failed to create evaluation")
                
        except Exception as e:
            logger.error("Failed to create evaluation", error=str(e))
            raise
    
    def get_evaluation(self, evaluation_id: str) -> Optional[Dict[str, Any]]:
        """Get evaluation by ID."""
        if not self.is_available():
            return None
        
        try:
            result = self.client.table('evaluations').select('*').eq('id', evaluation_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error("Failed to get evaluation", evaluation_id=evaluation_id, error=str(e))
            return None
    
    def get_evaluations(self, skip: int = 0, limit: int = 100, model_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get evaluations with optional filtering."""
        if not self.is_available():
            return []
        
        try:
            query = self.client.table('evaluations').select('*')
            
            if model_id:
                query = query.eq('model_id', model_id)
            
            result = query.range(skip, skip + limit - 1).order('created_at', desc=True).execute()
            return result.data or []
        except Exception as e:
            logger.error("Failed to get evaluations", error=str(e))
            return []
    
    def update_evaluation(self, evaluation_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update evaluation."""
        if not self.is_available():
            return None
        
        try:
            result = self.client.table('evaluations').update(update_data).eq('id', evaluation_id).execute()
            
            if result.data:
                logger.info("Evaluation updated", evaluation_id=evaluation_id)
                return result.data[0]
            else:
                logger.warning("No evaluation found to update", evaluation_id=evaluation_id)
                return None
                
        except Exception as e:
            logger.error("Failed to update evaluation", evaluation_id=evaluation_id, error=str(e))
            return None
    
    def create_evaluation_result(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create evaluation result."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            result = self.client.table('evaluation_results').insert(result_data).execute()
            
            if result.data:
                logger.info("Evaluation result created", result_id=result.data[0]['id'])
                return result.data[0]
            else:
                raise RuntimeError("Failed to create evaluation result")
                
        except Exception as e:
            logger.error("Failed to create evaluation result", error=str(e))
            raise
    
    def store_comprehensive_results(self, evaluation_id: str, results_data: Dict[str, Any]) -> Dict[str, Any]:
        """Store comprehensive evaluation results with enhanced metadata."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            # Store enhanced result data
            enhanced_data = {
                "evaluation_id": evaluation_id,
                "all_metrics": results_data.get("all_metrics", {}),
                "per_sample_results": results_data.get("per_sample_results", {}),
                "model_responses": results_data.get("model_responses", []),
                "error_analysis": results_data.get("error_analysis", {}),
                "performance_score": results_data.get("performance_score", 0.0),
                "primary_metrics": results_data.get("primary_metrics", {}),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Update existing result or create new one
            result = self.client.table('evaluation_results').upsert(enhanced_data).execute()
            
            if result.data:
                logger.info("Comprehensive results stored", evaluation_id=evaluation_id)
                return result.data[0]
            else:
                raise RuntimeError("Failed to store comprehensive results")
                
        except Exception as e:
            logger.error("Failed to store comprehensive results", evaluation_id=evaluation_id, error=str(e))
            raise
    
    def store_sample_results(self, evaluation_id: str, benchmark_id: str, samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Store per-sample results for detailed analysis."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            # Prepare sample results data
            sample_data = {
                "evaluation_id": evaluation_id,
                "benchmark_id": benchmark_id,
                "per_sample_results": samples,
                "samples_count": len(samples),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Update the evaluation result with sample data
            result = self.client.table('evaluation_results').update({
                "per_sample_results": samples,
                "samples_count": len(samples)
            }).eq('evaluation_id', evaluation_id).eq('benchmark_id', benchmark_id).execute()
            
            if result.data:
                logger.info("Sample results stored", evaluation_id=evaluation_id, benchmark_id=benchmark_id, samples_count=len(samples))
                return result.data[0]
            else:
                raise RuntimeError("Failed to store sample results")
                
        except Exception as e:
            logger.error("Failed to store sample results", evaluation_id=evaluation_id, benchmark_id=benchmark_id, error=str(e))
            raise
    
    def update_evaluation_statistics(self, evaluation_id: str, stats: Dict[str, Any]) -> Dict[str, Any]:
        """Update evaluation with comprehensive statistics."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            # Prepare statistics data
            stats_data = {
                "total_samples": stats.get("total_samples", 0),
                "successful_samples": stats.get("successful_samples", 0),
                "failed_samples": stats.get("failed_samples", 0),
                "avg_inference_time_ms": stats.get("avg_inference_time_ms", 0.0),
                "peak_memory_usage_mb": stats.get("peak_memory_usage_mb", 0.0),
                "peak_cpu_usage_percent": stats.get("peak_cpu_usage_percent", 0.0),
                "evaluation_metadata": stats.get("evaluation_metadata", {}),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Update evaluation with statistics
            result = self.client.table('evaluations').update(stats_data).eq('id', evaluation_id).execute()
            
            if result.data:
                logger.info("Evaluation statistics updated", evaluation_id=evaluation_id, stats=stats_data)
                return result.data[0]
            else:
                raise RuntimeError("Failed to update evaluation statistics")
                
        except Exception as e:
            logger.error("Failed to update evaluation statistics", evaluation_id=evaluation_id, error=str(e))
            raise
    
    def get_evaluation_results(self, evaluation_id: str) -> List[Dict[str, Any]]:
        """Get evaluation results."""
        if not self.is_available():
            return []
        
        try:
            result = self.client.table('evaluation_results').select('*').eq('evaluation_id', evaluation_id).execute()
            return result.data or []
        except Exception as e:
            logger.error("Failed to get evaluation results", evaluation_id=evaluation_id, error=str(e))
            return []
    
    def upsert_evaluation_progress(self, progress_data: Dict[str, Any]) -> Dict[str, Any]:
        """Upsert evaluation progress."""
        if not self.is_available():
            raise RuntimeError("Supabase not available")
        
        try:
            # First try to update existing progress
            result = self.client.table('evaluation_progress').update(progress_data).eq('evaluation_id', progress_data['evaluation_id']).execute()
            
            if not result.data:
                # If no existing progress, create new one
                result = self.client.table('evaluation_progress').insert(progress_data).execute()
            
            if result.data:
                return result.data[0]
            else:
                raise RuntimeError("Failed to upsert evaluation progress")
                
        except Exception as e:
            logger.error("Failed to upsert evaluation progress", error=str(e))
            raise
    
    def get_evaluation_progress(self, evaluation_id: str) -> Optional[Dict[str, Any]]:
        """Get evaluation progress."""
        if not self.is_available():
            return None
        
        try:
            result = self.client.table('evaluation_progress').select('*').eq('evaluation_id', evaluation_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error("Failed to get evaluation progress", evaluation_id=evaluation_id, error=str(e))
            return None

# Global Supabase service instance
supabase_service = SupabaseService()
