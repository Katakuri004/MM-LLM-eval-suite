#!/usr/bin/env python3
"""
Test runner script for the LMMS-Eval Dashboard backend.
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path

def run_tests(test_pattern=None, verbose=False, coverage=False, parallel=False):
    """
    Run tests with specified options.
    
    Args:
        test_pattern: Pattern to match test files/functions
        verbose: Enable verbose output
        coverage: Enable coverage reporting
        parallel: Run tests in parallel
    """
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Build pytest command
    cmd = ["python", "-m", "pytest"]
    
    # Add test directory
    cmd.append("tests/")
    
    # Add test pattern if specified
    if test_pattern:
        cmd.append(f"-k {test_pattern}")
    
    # Add verbose flag
    if verbose:
        cmd.append("-v")
    
    # Add parallel execution
    if parallel:
        cmd.extend(["-n", "auto"])
    
    # Add coverage
    if coverage:
        cmd.extend([
            "--cov=.",
            "--cov-report=html",
            "--cov-report=term-missing",
            "--cov-fail-under=80"
        ])
    
    # Add other useful options
    cmd.extend([
        "--tb=short",  # Shorter traceback format
        "--strict-markers",  # Strict marker checking
        "--disable-warnings",  # Disable warnings for cleaner output
        "--color=yes"  # Colored output
    ])
    
    print(f"Running command: {' '.join(cmd)}")
    print("-" * 50)
    
    # Run tests
    try:
        result = subprocess.run(cmd, check=True)
        print("\n" + "=" * 50)
        print("✅ All tests passed!")
        return 0
    except subprocess.CalledProcessError as e:
        print("\n" + "=" * 50)
        print(f"❌ Tests failed with exit code {e.returncode}")
        return e.returncode
    except KeyboardInterrupt:
        print("\n" + "=" * 50)
        print("⚠️  Tests interrupted by user")
        return 1

def run_specific_tests():
    """Run specific test categories."""
    
    test_categories = {
        "websocket": "WebSocket functionality tests",
        "evaluation": "Evaluation service tests", 
        "integration": "Integration tests",
        "unit": "Unit tests only",
        "api": "API endpoint tests"
    }
    
    print("Available test categories:")
    for key, description in test_categories.items():
        print(f"  {key}: {description}")
    
    choice = input("\nEnter test category (or 'all' for all tests): ").strip().lower()
    
    if choice == "all":
        return run_tests(verbose=True, coverage=True)
    elif choice in test_categories:
        return run_tests(test_pattern=choice, verbose=True)
    else:
        print(f"Unknown category: {choice}")
        return 1

def check_dependencies():
    """Check if test dependencies are installed."""
    required_packages = [
        "pytest",
        "pytest-asyncio", 
        "pytest-cov",
        "pytest-xdist",
        "httpx"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required test dependencies:")
        for package in missing_packages:
            print(f"  - {package}")
        print("\nInstall with: pip install " + " ".join(missing_packages))
        return False
    
    print("✅ All test dependencies are installed")
    return True

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Run LMMS-Eval Dashboard backend tests")
    parser.add_argument("--pattern", "-k", help="Test pattern to match")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--coverage", "-c", action="store_true", help="Enable coverage reporting")
    parser.add_argument("--parallel", "-p", action="store_true", help="Run tests in parallel")
    parser.add_argument("--check-deps", action="store_true", help="Check test dependencies")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive test selection")
    
    args = parser.parse_args()
    
    # Check dependencies if requested
    if args.check_deps:
        if not check_dependencies():
            return 1
        return 0
    
    # Interactive mode
    if args.interactive:
        return run_specific_tests()
    
    # Check dependencies before running tests
    if not check_dependencies():
        print("\nRun with --check-deps to see missing dependencies")
        return 1
    
    # Run tests
    return run_tests(
        test_pattern=args.pattern,
        verbose=args.verbose,
        coverage=args.coverage,
        parallel=args.parallel
    )

if __name__ == "__main__":
    sys.exit(main())
