#!/usr/bin/env python3
"""
Update existing benchmarks with correct task names from lmms-eval.

This script:
1. Discovers available tasks from lmms-eval
2. Maps existing benchmarks to correct task names
3. Updates the database with the correct mappings
"""

import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from services.task_discovery_service import task_discovery_service
from services.supabase_service import supabase_service
import structlog

logger = structlog.get_logger(__name__)


async def update_benchmark_task_names():
    """Update all benchmarks with correct task names."""
    logger.info("Starting benchmark task name update")
    
    try:
        # Step 1: Discover available tasks
        logger.info("Discovering available tasks from lmms-eval")
        available_tasks = await task_discovery_service.get_available_tasks()
        logger.info("Found available tasks", count=len(available_tasks), tasks=available_tasks[:10])
        
        # Step 2: Get all benchmarks
        logger.info("Fetching benchmarks from database")
        benchmarks = supabase_service.get_benchmarks(limit=1000)  # Get all benchmarks
        logger.info("Found benchmarks", count=len(benchmarks))
        
        # Step 3: Update each benchmark
        updated_count = 0
        failed_count = 0
        
        for benchmark in benchmarks:
            try:
                benchmark_id = benchmark['id']
                benchmark_name = benchmark['name']
                current_task_name = benchmark.get('task_name')
                
                logger.info("Processing benchmark", 
                           id=benchmark_id, 
                           name=benchmark_name,
                           current_task_name=current_task_name)
                
                # Map benchmark to task name
                mapped_task = await task_discovery_service.map_benchmark_to_task(benchmark)
                
                if mapped_task:
                    # Update the benchmark with the correct task name
                    success = supabase_service.update_benchmark_task_name(benchmark_id, mapped_task)
                    
                    if success:
                        logger.info("Updated benchmark task name", 
                                   benchmark_id=benchmark_id,
                                   name=benchmark_name,
                                   task_name=mapped_task)
                        updated_count += 1
                    else:
                        logger.error("Failed to update benchmark", benchmark_id=benchmark_id)
                        failed_count += 1
                else:
                    logger.warning("No task mapping found for benchmark", 
                                  benchmark_id=benchmark_id,
                                  name=benchmark_name)
                    failed_count += 1
                    
            except Exception as e:
                logger.error("Error processing benchmark", 
                           benchmark_id=benchmark.get('id'),
                           error=str(e))
                failed_count += 1
        
        # Step 4: Summary
        logger.info("Benchmark update completed", 
                   total=len(benchmarks),
                   updated=updated_count,
                   failed=failed_count)
        
        if updated_count > 0:
            logger.info("✅ Successfully updated benchmark task names")
        else:
            logger.warning("⚠️ No benchmarks were updated")
            
        if failed_count > 0:
            logger.warning(f"⚠️ {failed_count} benchmarks failed to update")
            
    except Exception as e:
        logger.error("Failed to update benchmark task names", error=str(e))
        raise


async def main():
    """Main entry point."""
    print("=" * 60)
    print("BENCHMARK TASK NAME UPDATE")
    print("=" * 60)
    
    try:
        await update_benchmark_task_names()
        print("\n✅ Task name update completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Task name update failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
