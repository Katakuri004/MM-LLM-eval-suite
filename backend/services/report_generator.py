"""
Report Generator Service

Generates comprehensive reports in PDF, CSV, and JSON formats
for evaluation results and model comparisons.
"""

import json
import csv
import io
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
import structlog

from services.supabase_service import supabase_service

logger = structlog.get_logger(__name__)

class ReportGenerator:
    """Service for generating evaluation reports in multiple formats."""
    
    def __init__(self):
        """Initialize the report generator."""
        self.workspace_root = Path("C:/temp/lmms_eval_workspace")
        self.reports_dir = self.workspace_root / "reports"
        self.reports_dir.mkdir(exist_ok=True, parents=True)
        
        logger.info("Report generator initialized", workspace=str(self.workspace_root))
    
    async def generate_evaluation_report(
        self,
        evaluation_id: str,
        format: str = "json",
        include_samples: bool = False,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive report for a single evaluation.
        
        Args:
            evaluation_id: ID of the evaluation
            format: Report format (json, csv, pdf)
            include_samples: Whether to include per-sample results
            include_metadata: Whether to include evaluation metadata
            
        Returns:
            Report data and file path
        """
        try:
            # Get evaluation data
            evaluation = supabase_service.get_evaluation(evaluation_id)
            if not evaluation:
                raise ValueError(f"Evaluation {evaluation_id} not found")
            
            # Get evaluation results
            results = supabase_service.get_evaluation_results(evaluation_id)
            
            # Get model and benchmark details
            model = supabase_service.get_model_by_id(evaluation["model_id"])
            benchmarks = [
                supabase_service.get_benchmark_by_id(bid)
                for bid in evaluation.get("benchmark_ids", [])
            ]
            benchmarks = [b for b in benchmarks if b is not None]
            
            # Prepare report data
            report_data = {
                "evaluation": {
                    "id": evaluation_id,
                    "name": evaluation.get("name", ""),
                    "status": evaluation.get("status", ""),
                    "created_at": evaluation.get("created_at", ""),
                    "completed_at": evaluation.get("completed_at", ""),
                    "total_samples": evaluation.get("total_samples", 0),
                    "successful_samples": evaluation.get("successful_samples", 0),
                    "performance_score": evaluation.get("performance_score", 0.0),
                    "is_partial": evaluation.get("is_partial", False),
                    "retry_count": evaluation.get("retry_count", 0),
                    "resume_count": evaluation.get("resume_count", 0)
                },
                "model": {
                    "id": model.get("id", ""),
                    "name": model.get("name", ""),
                    "family": model.get("family", ""),
                    "modality": model.get("modality", ""),
                    "source": model.get("source", "")
                } if model else {},
                "benchmarks": [
                    {
                        "id": b.get("id", ""),
                        "name": b.get("name", ""),
                        "description": b.get("description", ""),
                        "modality": b.get("modality", ""),
                        "task_name": b.get("task_name", "")
                    }
                    for b in benchmarks
                ],
                "results": [],
                "summary": {
                    "total_benchmarks": len(benchmarks),
                    "completed_benchmarks": len([r for r in results if r.get("status") == "completed"]),
                    "total_samples": sum(r.get("samples_count", 0) for r in results),
                    "avg_performance": sum(r.get("performance_score", 0) for r in results) / len(results) if results else 0,
                    "execution_time": evaluation.get("execution_time_seconds", 0)
                }
            }
            
            # Add results data
            for result in results:
                result_data = {
                    "benchmark_id": result.get("benchmark_id", ""),
                    "benchmark_name": result.get("benchmark_name", ""),
                    "task_name": result.get("task_name", ""),
                    "status": result.get("status", ""),
                    "samples_count": result.get("samples_count", 0),
                    "execution_time_seconds": result.get("execution_time_seconds", 0),
                    "performance_score": result.get("performance_score", 0.0),
                    "metrics": result.get("metrics", {}),
                    "primary_metrics": result.get("primary_metrics", {}),
                    "created_at": result.get("created_at", "")
                }
                
                if include_samples and result.get("per_sample_results"):
                    result_data["per_sample_results"] = result.get("per_sample_results")
                
                report_data["results"].append(result_data)
            
            # Add metadata if requested
            if include_metadata:
                report_data["metadata"] = {
                    "generated_at": datetime.utcnow().isoformat(),
                    "generator_version": "1.0",
                    "format": format,
                    "include_samples": include_samples,
                    "evaluation_metadata": evaluation.get("evaluation_metadata", {}),
                    "checkpoint_data": evaluation.get("checkpoint_data"),
                    "retry_errors": evaluation.get("retry_errors", [])
                }
            
            # Generate file based on format
            if format == "json":
                return await self._generate_json_report(evaluation_id, report_data)
            elif format == "csv":
                return await self._generate_csv_report(evaluation_id, report_data)
            elif format == "pdf":
                return await self._generate_pdf_report(evaluation_id, report_data)
            else:
                raise ValueError(f"Unsupported format: {format}")
                
        except Exception as e:
            logger.error("Failed to generate evaluation report", 
                        evaluation_id=evaluation_id, error=str(e))
            raise
    
    async def generate_comparison_report(
        self,
        model_ids: List[str],
        benchmark_ids: Optional[List[str]] = None,
        format: str = "json",
        include_timeline: bool = True
    ) -> Dict[str, Any]:
        """
        Generate a comparison report for multiple models.
        
        Args:
            model_ids: List of model IDs to compare
            benchmark_ids: Optional list of benchmark IDs to filter
            format: Report format (json, csv, pdf)
            include_timeline: Whether to include evaluation timeline
            
        Returns:
            Report data and file path
        """
        try:
            # Get models data
            models = []
            for model_id in model_ids:
                model = supabase_service.get_model_by_id(model_id)
                if model:
                    models.append(model)
            
            if not models:
                raise ValueError("No valid models found")
            
            # Get evaluations for these models
            all_evaluations = []
            for model in models:
                evaluations = supabase_service.get_evaluations_by_model(model["id"])
                all_evaluations.extend(evaluations)
            
            # Filter by benchmarks if specified
            if benchmark_ids:
                all_evaluations = [
                    eval for eval in all_evaluations
                    if any(bid in eval.get("benchmark_ids", []) for bid in benchmark_ids)
                ]
            
            # Get results for all evaluations
            all_results = []
            for evaluation in all_evaluations:
                results = supabase_service.get_evaluation_results(evaluation["id"])
                all_results.extend(results)
            
            # Prepare comparison data
            comparison_data = {
                "models": [
                    {
                        "id": model["id"],
                        "name": model["name"],
                        "family": model["family"],
                        "modality": model["modality"],
                        "source": model["source"]
                    }
                    for model in models
                ],
                "evaluations": [
                    {
                        "id": eval["id"],
                        "name": eval["name"],
                        "model_id": eval["model_id"],
                        "status": eval["status"],
                        "created_at": eval["created_at"],
                        "completed_at": eval.get("completed_at"),
                        "total_samples": eval.get("total_samples", 0),
                        "performance_score": eval.get("performance_score", 0.0),
                        "benchmark_ids": eval.get("benchmark_ids", [])
                    }
                    for eval in all_evaluations
                ],
                "results": [
                    {
                        "evaluation_id": result.get("evaluation_id", ""),
                        "benchmark_id": result.get("benchmark_id", ""),
                        "benchmark_name": result.get("benchmark_name", ""),
                        "model_id": next(
                            (eval["model_id"] for eval in all_evaluations 
                             if eval["id"] == result.get("evaluation_id")), ""
                        ),
                        "performance_score": result.get("performance_score", 0.0),
                        "metrics": result.get("metrics", {}),
                        "samples_count": result.get("samples_count", 0)
                    }
                    for result in all_results
                ],
                "summary": {
                    "total_models": len(models),
                    "total_evaluations": len(all_evaluations),
                    "completed_evaluations": len([e for e in all_evaluations if e["status"] == "completed"]),
                    "total_results": len(all_results),
                    "avg_performance": sum(r.get("performance_score", 0) for r in all_results) / len(all_results) if all_results else 0
                }
            }
            
            # Add timeline if requested
            if include_timeline:
                timeline_data = []
                for evaluation in sorted(all_evaluations, key=lambda x: x["created_at"]):
                    timeline_data.append({
                        "date": evaluation["created_at"][:10],  # YYYY-MM-DD
                        "evaluation_id": evaluation["id"],
                        "model_id": evaluation["model_id"],
                        "status": evaluation["status"],
                        "performance_score": evaluation.get("performance_score", 0.0)
                    })
                comparison_data["timeline"] = timeline_data
            
            # Generate file based on format
            if format == "json":
                return await self._generate_json_report("comparison", comparison_data)
            elif format == "csv":
                return await self._generate_csv_report("comparison", comparison_data)
            elif format == "pdf":
                return await self._generate_pdf_report("comparison", comparison_data)
            else:
                raise ValueError(f"Unsupported format: {format}")
                
        except Exception as e:
            logger.error("Failed to generate comparison report", error=str(e))
            raise
    
    async def _generate_json_report(
        self, 
        report_id: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate JSON report file."""
        try:
            filename = f"{report_id}_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            filepath = self.reports_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            logger.info("JSON report generated", filepath=str(filepath))
            
            return {
                "format": "json",
                "filepath": str(filepath),
                "filename": filename,
                "size_bytes": filepath.stat().st_size,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Failed to generate JSON report", error=str(e))
            raise
    
    async def _generate_csv_report(
        self, 
        report_id: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate CSV report file."""
        try:
            filename = f"{report_id}_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
            filepath = self.reports_dir / filename
            
            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                
                # Write evaluation summary
                if "evaluation" in data:
                    writer.writerow(["Evaluation Summary"])
                    writer.writerow(["Field", "Value"])
                    for key, value in data["evaluation"].items():
                        writer.writerow([key, value])
                    writer.writerow([])
                
                # Write model information
                if "model" in data:
                    writer.writerow(["Model Information"])
                    writer.writerow(["Field", "Value"])
                    for key, value in data["model"].items():
                        writer.writerow([key, value])
                    writer.writerow([])
                
                # Write results
                if "results" in data and data["results"]:
                    writer.writerow(["Results"])
                    if data["results"]:
                        # Get all possible columns
                        all_columns = set()
                        for result in data["results"]:
                            all_columns.update(result.keys())
                        
                        # Write header
                        writer.writerow(list(all_columns))
                        
                        # Write data rows
                        for result in data["results"]:
                            row = [result.get(col, "") for col in all_columns]
                            writer.writerow(row)
            
            logger.info("CSV report generated", filepath=str(filepath))
            
            return {
                "format": "csv",
                "filepath": str(filepath),
                "filename": filename,
                "size_bytes": filepath.stat().st_size,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Failed to generate CSV report", error=str(e))
            raise
    
    async def _generate_pdf_report(
        self, 
        report_id: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate PDF report file."""
        try:
            # For now, generate a simple text-based PDF
            # In a production system, you'd use a library like reportlab or weasyprint
            filename = f"{report_id}_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.txt"
            filepath = self.reports_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write("EVALUATION REPORT\n")
                f.write("=" * 50 + "\n\n")
                
                if "evaluation" in data:
                    f.write("EVALUATION DETAILS\n")
                    f.write("-" * 20 + "\n")
                    for key, value in data["evaluation"].items():
                        f.write(f"{key}: {value}\n")
                    f.write("\n")
                
                if "model" in data:
                    f.write("MODEL INFORMATION\n")
                    f.write("-" * 20 + "\n")
                    for key, value in data["model"].items():
                        f.write(f"{key}: {value}\n")
                    f.write("\n")
                
                if "results" in data:
                    f.write("RESULTS\n")
                    f.write("-" * 10 + "\n")
                    for i, result in enumerate(data["results"], 1):
                        f.write(f"Result {i}:\n")
                        for key, value in result.items():
                            if key != "per_sample_results":  # Skip large sample data
                                f.write(f"  {key}: {value}\n")
                        f.write("\n")
            
            logger.info("Text report generated (PDF placeholder)", filepath=str(filepath))
            
            return {
                "format": "pdf",
                "filepath": str(filepath),
                "filename": filename,
                "size_bytes": filepath.stat().st_size,
                "generated_at": datetime.utcnow().isoformat(),
                "note": "Text format (PDF generation requires additional dependencies)"
            }
            
        except Exception as e:
            logger.error("Failed to generate PDF report", error=str(e))
            raise
    
    def list_reports(self) -> List[Dict[str, Any]]:
        """List all generated reports."""
        try:
            reports = []
            for report_file in self.reports_dir.glob("*_report_*.json"):
                try:
                    stat = report_file.stat()
                    reports.append({
                        "filename": report_file.name,
                        "filepath": str(report_file),
                        "size_bytes": stat.st_size,
                        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "format": "json"
                    })
                except Exception as e:
                    logger.warning("Failed to process report file", file=str(report_file), error=str(e))
            
            return sorted(reports, key=lambda x: x["created_at"], reverse=True)
            
        except Exception as e:
            logger.error("Failed to list reports", error=str(e))
            return []
    
    def cleanup_old_reports(self, days: int = 30) -> int:
        """Clean up reports older than specified days."""
        try:
            cutoff_time = datetime.utcnow().timestamp() - (days * 24 * 60 * 60)
            cleaned_count = 0
            
            for report_file in self.reports_dir.glob("*_report_*"):
                if report_file.stat().st_ctime < cutoff_time:
                    report_file.unlink()
                    cleaned_count += 1
            
            logger.info("Cleaned up old reports", count=cleaned_count, days=days)
            return cleaned_count
            
        except Exception as e:
            logger.error("Failed to cleanup old reports", error=str(e))
            return 0

# Global instance
report_generator = ReportGenerator()
