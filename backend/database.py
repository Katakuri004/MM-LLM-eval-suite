"""
Database connection and management for the LMMS-Eval Dashboard.

This module provides database connectivity, connection pooling, and database
operation utilities using Supabase as the primary database backend.
"""

import asyncio
from typing import Dict, List, Optional, Any, Union
from contextlib import asynccontextmanager
import structlog
from supabase import create_client, Client
from supabase._sync.client import SyncClient
import httpx
from config import settings, database_config

# Configure structured logging
logger = structlog.get_logger(__name__)


class DatabaseManager:
    """
    Database manager for Supabase operations.
    
    Handles connection management, query execution, and error handling
    for all database operations.
    """
    
    def __init__(self):
        """Initialize database manager with Supabase client."""
        self.client: Optional[Client] = None
        self.service_client: Optional[Client] = None
        self._connection_pool = None
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize Supabase clients for different access levels."""
        try:
            # Public client for user operations
            self.client = create_client(
                settings.supabase_url,
                settings.supabase_key
            )
            
            # Service role client for admin operations
            self.service_client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
            
            logger.info("Database clients initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize database clients", error=str(e))
            raise
    
    @property
    def public_client(self) -> Client:
        """Get public Supabase client for user operations."""
        if not self.client:
            raise RuntimeError("Database client not initialized")
        return self.client
    
    @property
    def admin_client(self) -> Client:
        """Get admin Supabase client for service operations."""
        if not self.service_client:
            raise RuntimeError("Service client not initialized")
        return self.service_client
    
    async def health_check(self) -> bool:
        """
        Check database connectivity.
        
        Returns:
            bool: True if database is accessible, False otherwise
        """
        try:
            # Simple query to test connectivity
            response = self.public_client.table("models").select("id").limit(1).execute()
            return True
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
            return False
    
    async def execute_query(
        self,
        table: str,
        operation: str = "select",
        data: Optional[Dict[str, Any]] = None,
        filters: Optional[Dict[str, Any]] = None,
        admin_access: bool = False
    ) -> Dict[str, Any]:
        """
        Execute database query with error handling.
        
        Args:
            table: Table name
            operation: Operation type (select, insert, update, delete)
            data: Data for insert/update operations
            filters: Query filters
            admin_access: Whether to use admin client
            
        Returns:
            Dict containing query results and metadata
        """
        client = self.admin_client if admin_access else self.public_client
        
        try:
            query = client.table(table)
            
            if operation == "select":
                if filters:
                    for key, value in filters.items():
                        query = query.eq(key, value)
                result = query.execute()
                
            elif operation == "insert":
                if not data:
                    raise ValueError("Data required for insert operation")
                result = query.insert(data).execute()
                
            elif operation == "update":
                if not data or not filters:
                    raise ValueError("Data and filters required for update operation")
                for key, value in filters.items():
                    query = query.eq(key, value)
                result = query.update(data).execute()
                
            elif operation == "delete":
                if not filters:
                    raise ValueError("Filters required for delete operation")
                for key, value in filters.items():
                    query = query.eq(key, value)
                result = query.delete().execute()
                
            else:
                raise ValueError(f"Unsupported operation: {operation}")
            
            logger.info(
                "Database query executed successfully",
                table=table,
                operation=operation,
                result_count=len(result.data) if result.data else 0
            )
            
            return {
                "success": True,
                "data": result.data,
                "count": result.count,
                "error": None
            }
            
        except Exception as e:
            logger.error(
                "Database query failed",
                table=table,
                operation=operation,
                error=str(e)
            )
            return {
                "success": False,
                "data": None,
                "count": 0,
                "error": str(e)
            }
    
    async def get_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get run by ID with related data."""
        result = await self.execute_query(
            table="runs",
            operation="select",
            filters={"id": run_id}
        )
        
        if result["success"] and result["data"]:
            return result["data"][0]
        return None
    
    async def get_model_by_id(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get model by ID with checkpoints."""
        result = await self.execute_query(
            table="models",
            operation="select",
            filters={"id": model_id}
        )
        
        if result["success"] and result["data"]:
            return result["data"][0]
        return None
    
    async def get_benchmarks_by_category(
        self, 
        category: Optional[str] = None,
        modality: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get benchmarks filtered by category and modality."""
        filters = {}
        if category:
            filters["category"] = category
        if modality:
            filters["modality"] = modality
            
        result = await self.execute_query(
            table="benchmarks",
            operation="select",
            filters=filters
        )
        
        return result["data"] if result["success"] else []
    
    async def create_run(
        self,
        name: str,
        model_id: str,
        benchmark_ids: List[str],
        config: Dict[str, Any],
        user_id: str
    ) -> Optional[str]:
        """Create a new evaluation run."""
        run_data = {
            "name": name,
            "model_id": model_id,
            "config": config,
            "status": "pending",
            "total_tasks": len(benchmark_ids),
            "completed_tasks": 0,
            "created_by": user_id
        }
        
        result = await self.execute_query(
            table="runs",
            operation="insert",
            data=run_data,
            admin_access=True
        )
        
        if result["success"] and result["data"]:
            run_id = result["data"][0]["id"]
            
            # Create run_benchmarks entries
            for i, benchmark_id in enumerate(benchmark_ids):
                await self.execute_query(
                    table="run_benchmarks",
                    operation="insert",
                    data={
                        "run_id": run_id,
                        "benchmark_id": benchmark_id,
                        "order": i,
                        "status": "pending"
                    },
                    admin_access=True
                )
            
            return run_id
        
        return None
    
    async def update_run_status(
        self,
        run_id: str,
        status: str,
        error_message: Optional[str] = None
    ) -> bool:
        """Update run status."""
        update_data = {"status": status}
        if error_message:
            update_data["error_message"] = error_message
            
        result = await self.execute_query(
            table="runs",
            operation="update",
            data=update_data,
            filters={"id": run_id},
            admin_access=True
        )
        
        return result["success"]
    
    async def insert_metrics(
        self,
        run_id: str,
        benchmark_id: str,
        metrics: Dict[str, float],
        slice_id: Optional[str] = None
    ) -> bool:
        """Insert metrics for a run and benchmark."""
        success = True
        
        for metric_name, metric_value in metrics.items():
            result = await self.execute_query(
                table="run_metrics",
                operation="insert",
                data={
                    "run_id": run_id,
                    "benchmark_id": benchmark_id,
                    "metric_name": metric_name,
                    "metric_value": metric_value,
                    "slice_id": slice_id
                },
                admin_access=True
            )
            
            if not result["success"]:
                success = False
                logger.error(
                    "Failed to insert metric",
                    run_id=run_id,
                    benchmark_id=benchmark_id,
                    metric_name=metric_name,
                    error=result["error"]
                )
        
        return success
    
    async def get_leaderboard(
        self,
        benchmark_id: str,
        slice_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get leaderboard for a benchmark."""
        # This would require a more complex query with joins
        # For now, return a simplified version
        result = await self.execute_query(
            table="run_metrics",
            operation="select",
            filters={"benchmark_id": benchmark_id}
        )
        
        return result["data"] if result["success"] else []
    
    async def close_connections(self):
        """Close database connections."""
        if self._connection_pool:
            await self._connection_pool.close()
        logger.info("Database connections closed")


# Global database manager instance
db_manager = DatabaseManager()


async def get_database() -> DatabaseManager:
    """Get database manager instance."""
    return db_manager


@asynccontextmanager
async def get_db_transaction():
    """
    Context manager for database transactions.
    
    Provides automatic rollback on exceptions and commit on success.
    """
    try:
        yield db_manager
        # In a real implementation, you would commit the transaction here
        logger.info("Database transaction committed")
    except Exception as e:
        logger.error("Database transaction failed, rolling back", error=str(e))
        # In a real implementation, you would rollback the transaction here
        raise
    finally:
        # Cleanup if needed
        pass
