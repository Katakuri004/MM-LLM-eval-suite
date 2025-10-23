"""
Debug script to check what's failing in resource validation.
"""

import psutil
import shutil
from pathlib import Path

def debug_resource_check():
    """Debug the resource check to see what's failing."""
    print("=" * 60)
    print("DEBUGGING RESOURCE CHECK")
    print("=" * 60)
    
    # Check memory
    print("\n1. Checking memory...")
    memory = psutil.virtual_memory()
    available_gb = memory.available / (1024 ** 3)
    total_gb = memory.total / (1024 ** 3)
    used_gb = memory.used / (1024 ** 3)
    
    print(f"Total memory: {total_gb:.2f}GB")
    print(f"Used memory: {used_gb:.2f}GB")
    print(f"Available memory: {available_gb:.2f}GB")
    
    # Test different memory limits
    for limit in [8.0, 4.0, 2.0, 1.0, 0.5]:
        if available_gb >= limit:
            print(f"✅ Memory check PASSED for {limit}GB limit")
        else:
            print(f"❌ Memory check FAILED for {limit}GB limit (need {limit}GB, have {available_gb:.2f}GB)")
    
    # Check CPU
    print("\n2. Checking CPU...")
    cpu_percent = psutil.cpu_percent(interval=1)
    print(f"Current CPU usage: {cpu_percent}%")
    
    # Test different CPU limits
    for limit in [80.0, 90.0, 95.0, 99.0]:
        if cpu_percent <= limit:
            print(f"✅ CPU check PASSED for {limit}% limit")
        else:
            print(f"❌ CPU check FAILED for {limit}% limit (current: {cpu_percent}%)")
    
    # Check disk space
    print("\n3. Checking disk space...")
    workspace_root = Path("/tmp/lmms_eval_workspace")
    try:
        disk = shutil.disk_usage(workspace_root)
        available_gb = disk.free / (1024 ** 3)
        total_gb = disk.total / (1024 ** 3)
        used_gb = disk.used / (1024 ** 3)
        
        print(f"Total disk: {total_gb:.2f}GB")
        print(f"Used disk: {used_gb:.2f}GB")
        print(f"Available disk: {available_gb:.2f}GB")
        
        # Test different disk limits
        for limit in [10.0, 5.0, 2.0, 1.0, 0.5]:
            if available_gb >= limit:
                print(f"✅ Disk check PASSED for {limit}GB limit")
            else:
                print(f"❌ Disk check FAILED for {limit}GB limit (need {limit}GB, have {available_gb:.2f}GB)")
                
    except Exception as e:
        print(f"❌ Error checking disk space: {e}")
        # Try with current directory
        try:
            disk = shutil.disk_usage(".")
            available_gb = disk.free / (1024 ** 3)
            print(f"Available disk (current dir): {available_gb:.2f}GB")
        except Exception as e2:
            print(f"❌ Error checking current directory disk space: {e2}")
    
    print("\n" + "=" * 60)
    print("RECOMMENDED LIMITS FOR THIS SYSTEM:")
    print(f"Memory: {min(available_gb * 0.8, 2.0):.1f}GB")
    print(f"CPU: 95%")
    print(f"Disk: {min(available_gb * 0.1, 1.0):.1f}GB")

if __name__ == "__main__":
    debug_resource_check()
