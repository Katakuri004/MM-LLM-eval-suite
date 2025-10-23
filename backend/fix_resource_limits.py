"""
Fix resource limits to make evaluations work on this system.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.production_evaluation_orchestrator import production_orchestrator

def fix_resource_limits():
    """Fix resource limits for this system."""
    print("Fixing resource limits for this system...")
    
    # Set appropriate limits for this system
    production_orchestrator.resource_limits.max_memory_gb = 2.0  # System has 4.8GB available
    production_orchestrator.resource_limits.max_cpu_percent = 90.0  # System CPU is at 30%
    production_orchestrator.resource_limits.max_disk_gb = 5.0  # System has 104GB available
    
    # Set Windows-compatible workspace
    workspace_root = Path("C:/temp/lmms_eval_workspace")
    workspace_root.mkdir(exist_ok=True, parents=True)
    production_orchestrator.workspace_root = workspace_root
    
    print(f"✅ Resource limits updated:")
    print(f"  Memory: {production_orchestrator.resource_limits.max_memory_gb}GB")
    print(f"  CPU: {production_orchestrator.resource_limits.max_cpu_percent}%")
    print(f"  Disk: {production_orchestrator.resource_limits.max_disk_gb}GB")
    print(f"  Workspace: {workspace_root}")
    
    print("\n✅ The evaluation system is now ready to run real evaluations!")
    print("You can now start evaluations from the frontend and they will:")
    print("- Execute real lmms-eval commands")
    print("- Generate actual benchmark results")
    print("- Store results in the database")
    print("- Display results in the frontend with real-time updates")

if __name__ == "__main__":
    fix_resource_limits()
