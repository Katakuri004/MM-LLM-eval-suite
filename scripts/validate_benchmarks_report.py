#!/usr/bin/env python3
"""
Validate all benchmarks in the database against lmms-eval tasks (non-interactive).
"""

import sys
import os
import asyncio
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.supabase_service import supabase_service
from services.benchmark_validation_service import benchmark_validation_service


async def main():
    """Validate all benchmarks."""
    print("Fetching all benchmarks from database...")
    benchmarks = supabase_service.get_benchmarks(skip=0, limit=1000)
    
    if not benchmarks:
        print("No benchmarks found in database")
        return
    
    print(f"Found {len(benchmarks)} benchmarks")
    print("Validating against lmms-eval tasks...\n")
    
    report = await benchmark_validation_service.validate_all_benchmarks(benchmarks)
    
    # Print validation report
    print("=" * 80)
    print("BENCHMARK VALIDATION REPORT")
    print("=" * 80)
    print(f"Total Benchmarks: {report['total']}")
    print(f"Valid: {report['valid_count']}")
    print(f"Invalid: {report['invalid_count']}")
    print("=" * 80)
    
    if report['valid']:
        print("\nVALID BENCHMARKS:")
        print("-" * 80)
        for item in report['valid']:
            mapped = f" -> {item['mapped_task']}" if item['mapped_task'] != item['task_name'] else ""
            print(f"  [OK] {item['name']:<30} [{item['modality']:<12}] task: {item['task_name']}{mapped}")
    
    if report['invalid']:
        print("\nINVALID BENCHMARKS (Cannot be mapped to lmms-eval):")
        print("-" * 80)
        for item in report['invalid']:
            print(f"  [X] {item['name']:<30} [{item['modality']:<12}] - {item['reason']}")
    
    print("\n" + "=" * 80)
    print("Validation complete!")


if __name__ == '__main__':
    asyncio.run(main())
