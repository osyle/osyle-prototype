"""
Multi-File Output Parser

Handles conversion between LLM output formats:
1. Legacy: Single JSX string
2. New: Multi-file JSON structure

Ensures backward compatibility while enabling new capabilities.
"""
import json
import re
from typing import Dict, Any, Optional, Tuple


def parse_llm_output(llm_response: str) -> Dict[str, Any]:
    """
    Parse LLM output into multi-file structure
    
    Supports two formats:
    
    Format 1 (Legacy): Single JSX/TSX code
    ```
    export default function App() { ... }
    ```
    Returns: {
        "files": {"/App.tsx": "..."},
        "entry": "/App.tsx",
        "dependencies": {}
    }
    
    Format 2 (New): JSON with file structure
    ```
    {
      "files": {
        "/App.tsx": "...",
        "/components/Button.tsx": "..."
      },
      "entry": "/App.tsx",
      "dependencies": {"lucide-react": "^0.263.1"}
    }
    ```
    Returns: The parsed JSON structure
    
    Args:
        llm_response: Raw LLM output (may include markdown, JSON, or plain code)
    
    Returns:
        {
            "files": Dict[str, str],  # filepath -> code
            "entry": str,              # entry point filepath
            "dependencies": Dict[str, str],  # package -> version
            "format": str              # "legacy" or "multifile"
        }
    """
    
    # Clean response
    cleaned = llm_response.strip()
    
    # CRITICAL: Check if LLM incorrectly wrapped code in JSON
    # Pattern: json\n{"files": {"/App.tsx": "actual code"}}
    # This is WRONG - we want just the code, not a JSON wrapper
    if cleaned.startswith('json\n{') or cleaned.startswith('```json\n{'):
        print("  ⚠️  LLM output JSON wrapper (extracting code)...")
        try:
            # Remove 'json\n' prefix or ```json\n prefix
            json_str = cleaned.replace('json\n', '', 1).replace('```json\n', '', 1)
            # Remove trailing ```
            json_str = json_str.rstrip('`').strip()
            
            data = json.loads(json_str)
            
            # If it has "files" with a single "/App.tsx" entry, extract that code
            if isinstance(data, dict) and "files" in data:
                files = data["files"]
                if isinstance(files, dict) and len(files) == 1:
                    # Get the single file's code
                    code = list(files.values())[0]
                    print(f"  ✓ Extracted code from JSON wrapper ({len(code)} chars)")
                    return {
                        "files": {"/App.tsx": code},
                        "entry": "/App.tsx",
                        "dependencies": data.get("dependencies", {}),
                        "format": "legacy"
                    }
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"  ✗ Failed to parse JSON wrapper: {e}")
            # Fall through to normal parsing
    
    # Try to detect and parse JSON format first
    json_result = _try_parse_json(cleaned)
    if json_result:
        return json_result
    
    # Fallback: treat as legacy single-file format
    code = _clean_code_fences(cleaned)
    
    return {
        "files": {"/App.tsx": code},
        "entry": "/App.tsx",
        "dependencies": {},
        "format": "legacy"
    }


def _try_parse_json(response: str) -> Optional[Dict[str, Any]]:
    """
    Try to parse response as JSON multi-file structure
    
    Looks for JSON objects that match the multi-file schema:
    {
      "files": {...},
      "entry": "...",
      "dependencies": {...}
    }
    """
    
    # Look for JSON code blocks first
    json_block_pattern = r'```json\s*\n(.*?)\n```'
    matches = re.findall(json_block_pattern, response, re.DOTALL)
    
    if matches:
        # Try to parse the first JSON block
        try:
            data = json.loads(matches[0])
            if _validate_multifile_structure(data):
                return {
                    **data,
                    "format": "multifile"
                }
        except json.JSONDecodeError:
            pass
    
    # Try to parse entire response as JSON
    try:
        data = json.loads(response)
        if _validate_multifile_structure(data):
            return {
                **data,
                "format": "multifile"
            }
    except json.JSONDecodeError:
        pass
    
    # Look for JSON-like structure without code blocks
    # Pattern: starts with { and ends with }
    if response.strip().startswith('{') and response.strip().endswith('}'):
        try:
            data = json.loads(response)
            if _validate_multifile_structure(data):
                return {
                    **data,
                    "format": "multifile"
                }
        except json.JSONDecodeError:
            pass
    
    return None


def _validate_multifile_structure(data: Any) -> bool:
    """
    Validate that data matches multi-file schema
    
    Required:
    - "files" key with dict value
    
    Optional:
    - "entry" key with string value
    - "dependencies" key with dict value
    """
    
    if not isinstance(data, dict):
        return False
    
    # Must have "files" key
    if "files" not in data:
        return False
    
    # "files" must be a dict
    if not isinstance(data["files"], dict):
        return False
    
    # "files" must not be empty
    if len(data["files"]) == 0:
        return False
    
    # If "entry" exists, must be string
    if "entry" in data and not isinstance(data["entry"], str):
        return False
    
    # If "dependencies" exists, must be dict
    if "dependencies" in data and not isinstance(data["dependencies"], dict):
        return False
    
    return True


def _clean_code_fences(code: str) -> str:
    """
    Remove markdown code fences from code
    
    Handles:
    - ```jsx ... ```
    - ```typescript ... ```
    - ```tsx ... ```
    - ``` ... ```
    """
    
    # Remove fences
    code = re.sub(r'```(?:typescript|tsx|jsx|javascript|js|react)?\n', '', code)
    code = re.sub(r'\n```\s*$', '', code)
    code = re.sub(r'^```\s*', '', code)
    
    # Remove standalone language identifiers
    code = re.sub(r'^(typescript|javascript|jsx|tsx|ts|js|react)\s*$', '', code, flags=re.MULTILINE)
    
    return code.strip()


def ensure_default_dependencies(
    dependencies: Dict[str, str]
) -> Dict[str, str]:
    """
    Ensure default dependencies are included
    
    For CDN-based imports (esm.sh), we don't need npm dependencies in Sandpack.
    Just ensure lucide-react is available as it's commonly used.
    
    Args:
        dependencies: Existing dependencies dict
    
    Returns:
        Updated dependencies dict with defaults
    """
    defaults = {
        "lucide-react": "^0.263.1",
    }
    
    return {
        **defaults,
        **dependencies
    }


def normalize_file_paths(files: Dict[str, str]) -> Dict[str, str]:
    """
    Normalize file paths to ensure consistency
    
    - All paths start with /
    - No duplicate leading slashes
    - Consistent formatting
    
    Args:
        files: Dict of filepath -> code
    
    Returns:
        Normalized files dict
    """
    normalized = {}
    
    for filepath, code in files.items():
        # Ensure leading slash
        if not filepath.startswith('/'):
            filepath = '/' + filepath
        
        # Remove duplicate slashes
        filepath = re.sub(r'/+', '/', filepath)
        
        normalized[filepath] = code
    
    return normalized


def add_shadcn_components_to_files(
    files: Dict[str, str],
    components: list[str] = None
) -> Dict[str, str]:
    """
    Add shadcn/ui component files to the files dict
    
    DEPRECATED: With CDN imports, we no longer generate component files.
    This function is kept for backward compatibility but returns files unchanged.
    
    Args:
        files: Existing files dict
        components: List of component names (ignored)
    
    Returns:
        Files dict unchanged (components imported from CDN instead)
    """
    # No longer generate component files - screens import from CDN
    return files.copy()