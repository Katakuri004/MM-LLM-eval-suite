"""
Fix the workspace path issue for Windows.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.production_evaluation_orchestrator import production_orchestrator

def fix_workspace_path():
    """Fix the workspace path for Windows."""
    print("Fixing workspace path for Windows...")
    
    # Set a Windows-compatible workspace path
    workspace_root = Path("C:/temp/lmms_eval_workspace")
    workspace_root.mkdir(exist_ok=True, parents=True)
    
    # Update the orchestrator's workspace path
    production_orchestrator.workspace_root = workspace_root
    
    print(f"Workspace set to: {workspace_root}")
    
    # Test resource check with the new path
    print("\nTesting resource check with new workspace path...")
    try:
        result = await production_orchestrator._check_resources()
        print(f"Resource check result: {result}")
    except Exception as e:
        print(f"Resource check error: {e}")

if __name__ == "__main__":
    fix_workspace_path()
