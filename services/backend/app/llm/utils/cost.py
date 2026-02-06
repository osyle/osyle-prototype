"""
Cost tracking utilities for LLM usage monitoring
"""
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import json
from pathlib import Path

from ..types import Usage, GenerationResponse
from ..config import get_model_pricing


@dataclass
class RequestCost:
    """Cost information for a single request"""
    timestamp: datetime
    model: str
    usage: Usage
    input_cost: float
    output_cost: float
    cached_cost: float
    total_cost: float
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization"""
        return {
            "timestamp": self.timestamp.isoformat(),
            "model": self.model,
            "usage": {
                "input_tokens": self.usage.input_tokens,
                "output_tokens": self.usage.output_tokens,
                "cached_tokens": self.usage.cached_tokens,
                "total_tokens": self.usage.total_tokens,
            },
            "costs": {
                "input": self.input_cost,
                "output": self.output_cost,
                "cached": self.cached_cost,
                "total": self.total_cost,
            }
        }


class CostTracker:
    """Track LLM usage costs"""
    
    def __init__(self, save_path: Optional[Path] = None):
        """
        Initialize cost tracker
        
        Args:
            save_path: Optional path to save cost records
        """
        self.requests: List[RequestCost] = []
        self.save_path = save_path
        self._total_cost = 0.0
        self._costs_by_model: Dict[str, float] = {}
    
    def track_request(self, response: GenerationResponse) -> RequestCost:
        """
        Track cost for a generation response
        
        Args:
            response: Generation response to track
            
        Returns:
            RequestCost object
        """
        pricing = get_model_pricing(response.model)
        
        if pricing:
            input_cost = (response.usage.input_tokens * pricing.input_per_million) / 1_000_000
            output_cost = (response.usage.output_tokens * pricing.output_per_million) / 1_000_000
            cached_cost = 0.0
            
            if response.usage.cached_tokens > 0 and pricing.cached_input_per_million:
                cached_cost = (response.usage.cached_tokens * pricing.cached_input_per_million) / 1_000_000
        else:
            input_cost = output_cost = cached_cost = 0.0
        
        total_cost = input_cost + output_cost + cached_cost
        
        cost_record = RequestCost(
            timestamp=datetime.now(),
            model=response.model,
            usage=response.usage,
            input_cost=input_cost,
            output_cost=output_cost,
            cached_cost=cached_cost,
            total_cost=total_cost
        )
        
        self.requests.append(cost_record)
        self._total_cost += total_cost
        self._costs_by_model[response.model] = self._costs_by_model.get(response.model, 0.0) + total_cost
        
        # Save if path configured
        if self.save_path:
            self._save()
        
        return cost_record
    
    @property
    def total_cost(self) -> float:
        """Get total cost across all requests"""
        return self._total_cost
    
    def get_costs_by_model(self) -> Dict[str, float]:
        """Get costs grouped by model"""
        return self._costs_by_model.copy()
    
    def get_total_tokens(self) -> int:
        """Get total tokens used"""
        return sum(r.usage.total_tokens for r in self.requests)
    
    def get_stats(self) -> dict:
        """Get comprehensive statistics"""
        if not self.requests:
            return {
                "total_cost": 0.0,
                "total_requests": 0,
                "total_tokens": 0,
                "by_model": {}
            }
        
        # Calculate stats by model
        model_stats = {}
        for model in self._costs_by_model.keys():
            model_requests = [r for r in self.requests if r.model == model]
            model_stats[model] = {
                "requests": len(model_requests),
                "total_cost": self._costs_by_model[model],
                "total_tokens": sum(r.usage.total_tokens for r in model_requests),
                "avg_cost_per_request": self._costs_by_model[model] / len(model_requests),
                "input_tokens": sum(r.usage.input_tokens for r in model_requests),
                "output_tokens": sum(r.usage.output_tokens for r in model_requests),
                "cached_tokens": sum(r.usage.cached_tokens for r in model_requests),
            }
        
        return {
            "total_cost": self._total_cost,
            "total_requests": len(self.requests),
            "total_tokens": self.get_total_tokens(),
            "avg_cost_per_request": self._total_cost / len(self.requests),
            "by_model": model_stats
        }
    
    def print_summary(self):
        """Print cost summary"""
        stats = self.get_stats()
        
        print("\n" + "="*60)
        print("LLM COST SUMMARY")
        print("="*60)
        print(f"Total Cost: ${stats['total_cost']:.4f}")
        print(f"Total Requests: {stats['total_requests']}")
        print(f"Total Tokens: {stats['total_tokens']:,}")
        print(f"Avg Cost/Request: ${stats['avg_cost_per_request']:.4f}")
        print("\nBy Model:")
        print("-"*60)
        
        for model, model_stats in stats['by_model'].items():
            print(f"\n{model}:")
            print(f"  Requests: {model_stats['requests']}")
            print(f"  Total Cost: ${model_stats['total_cost']:.4f}")
            print(f"  Avg Cost: ${model_stats['avg_cost_per_request']:.4f}")
            print(f"  Tokens: {model_stats['total_tokens']:,} "
                  f"(Input: {model_stats['input_tokens']:,}, "
                  f"Output: {model_stats['output_tokens']:,}, "
                  f"Cached: {model_stats['cached_tokens']:,})")
        
        print("="*60 + "\n")
    
    def _save(self):
        """Save cost records to file"""
        if not self.save_path:
            return
        
        self.save_path.parent.mkdir(parents=True, exist_ok=True)
        
        data = {
            "total_cost": self._total_cost,
            "requests": [r.to_dict() for r in self.requests]
        }
        
        with open(self.save_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def load(self):
        """Load cost records from file"""
        if not self.save_path or not self.save_path.exists():
            return
        
        with open(self.save_path, 'r') as f:
            data = json.load(f)
        
        self._total_cost = data.get("total_cost", 0.0)
        
        for req_data in data.get("requests", []):
            usage = Usage(
                input_tokens=req_data["usage"]["input_tokens"],
                output_tokens=req_data["usage"]["output_tokens"],
                cached_tokens=req_data["usage"]["cached_tokens"],
            )
            
            cost_record = RequestCost(
                timestamp=datetime.fromisoformat(req_data["timestamp"]),
                model=req_data["model"],
                usage=usage,
                input_cost=req_data["costs"]["input"],
                output_cost=req_data["costs"]["output"],
                cached_cost=req_data["costs"]["cached"],
                total_cost=req_data["costs"]["total"]
            )
            
            self.requests.append(cost_record)
            
            model = cost_record.model
            self._costs_by_model[model] = self._costs_by_model.get(model, 0.0) + cost_record.total_cost
    
    def reset(self):
        """Reset all tracking data"""
        self.requests.clear()
        self._total_cost = 0.0
        self._costs_by_model.clear()
        
        if self.save_path and self.save_path.exists():
            self.save_path.unlink()


# Global cost tracker
_tracker: Optional[CostTracker] = None


def get_tracker() -> CostTracker:
    """Get global cost tracker"""
    global _tracker
    if _tracker is None:
        _tracker = CostTracker()
    return _tracker


def set_tracker(tracker: CostTracker):
    """Set global cost tracker"""
    global _tracker
    _tracker = tracker
