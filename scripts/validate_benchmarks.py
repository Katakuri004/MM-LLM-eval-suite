#!/usr/bin/env python3
"""
Validate all benchmarks in the database against lmms-eval tasks.
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
    
    # Ask if user wants to update task_name fields for valid benchmarks
    if report['valid']:
        print("\nWould you like to update task_name fields for valid benchmarks? (y/n): ", end='')
        response = input().strip().lower()
        
        if response == 'y':
            print("\nUpdating benchmarks with correct task names...")
            for item in report['valid']:
                if item['task_name'] != item['mapped_task']:
                    try:
                        supabase_service.client.table('benchmarks').update({
                            'task_name': item['mapped_task']
                        }).eq('id', item['id']).execute()
                        print(f"  Updated {item['name']}: {item['task_name']} -> {item['mapped_task']}")
                    except Exception as e:
                        print(f"  Failed to update {item['name']}: {e}")
            print("Update complete!")
    
    # Ask if user wants to delete invalid benchmarks
    if report['invalid']:
        print("\nWould you like to delete invalid benchmarks? (y/n): ", end='')
        response = input().strip().lower()
        
        if response == 'y':
            print("\nDeleting invalid benchmarks...")
            for item in report['invalid']:
                try:
                    supabase_service.client.table('benchmarks').delete().eq('id', item['id']).execute()
                    print(f"  Deleted {item['name']}")
                except Exception as e:
                    print(f"  Failed to delete {item['name']}: {e}")
            print("Deletion complete!")


if __name__ == '__main__':
    asyncio.run(main())
