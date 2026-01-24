"""
Checkpoint Extractor for Progressive UI Rendering (FIXED VERSION)
Extracts valid, compilable React code at each checkpoint marker
with comprehensive validation and aggressive cleaning
"""
from typing import Optional
import re


def extract_at_checkpoint(buffer: str) -> Optional[str]:
    """
    Extract compilable code up to the last checkpoint marker.
    
    Args:
        buffer: Accumulated code from LLM stream
        
    Returns:
        Complete, compilable React code up to last checkpoint, or None if no checkpoint
        
    How it works:
    1. Split on //$CHECKPOINT delimiter
    2. Find last /*CHECKPOINT ... */ block
    3. Extract completion code from that block
    4. Combine code before checkpoint with completion code
    5. Aggressively clean ALL checkpoint markers and artifacts
    6. Validate syntax
    7. Return if valid, None otherwise
    """
    print(f"\n   [EXTRACTOR] Starting extraction...")
    print(f"   [EXTRACTOR] Buffer size: {len(buffer)} chars")
    
    # Split by checkpoint delimiter
    parts = buffer.split('//$CHECKPOINT')
    print(f"   [EXTRACTOR] Split by //$CHECKPOINT: {len(parts)} parts")
    
    if len(parts) == 1:
        # No checkpoints yet - maybe Claude generated incomplete checkpoint?
        # Try to find /*CHECKPOINT marker without //$CHECKPOINT
        if '/*CHECKPOINT' in buffer:
            print(f"   [EXTRACTOR] ⚠️  Found /*CHECKPOINT but no //$CHECKPOINT delimiter")
            print(f"   [EXTRACTOR] ❌ Incomplete checkpoint format - skipping")
        else:
            print(f"   [EXTRACTOR] ❌ No checkpoint markers found")
        return None
    
    print(f"   [EXTRACTOR] ✅ Found {len(parts) - 1} //$CHECKPOINT markers")
    
    # Everything before the last //$CHECKPOINT
    code_before = '//$CHECKPOINT'.join(parts[:-1])
    print(f"   [EXTRACTOR] Code before last checkpoint: {len(code_before)} chars")
    
    # Find the last /*CHECKPOINT ... */ block
    checkpoint_start = code_before.rfind('/*CHECKPOINT')
    print(f"   [EXTRACTOR] Last /*CHECKPOINT at position: {checkpoint_start}")
    
    if checkpoint_start == -1:
        print(f"   [EXTRACTOR] ❌ No /*CHECKPOINT comment block found")
        print(f"   [EXTRACTOR] Last 300 chars of code_before:")
        print(f"   {repr(code_before[-300:])}")
        return None
    
    checkpoint_end = code_before.find('*/', checkpoint_start)
    print(f"   [EXTRACTOR] Checkpoint end */ at position: {checkpoint_end}")
    
    if checkpoint_end == -1:
        print(f"   [EXTRACTOR] ❌ No closing */ found for checkpoint block")
        return None
    
    # Extract the completion code from inside the comment block
    completion = code_before[checkpoint_start + 12:checkpoint_end].strip()
    print(f"   [EXTRACTOR] ✅ Extracted completion code: {len(completion)} chars")
    print(f"   [EXTRACTOR] Completion content:")
    print(f"   {repr(completion[:200])}")
    
    # Remove the checkpoint comment block from the code
    code_without_comment = code_before[:checkpoint_start].rstrip()
    print(f"   [EXTRACTOR] Code without checkpoint comment: {len(code_without_comment)} chars")
    
    # Combine: code before checkpoint + completion code
    complete_code = code_without_comment + '\n' + completion
    print(f"   [EXTRACTOR] Combined code (before cleaning): {len(complete_code)} chars")
    
    # CRITICAL: Aggressively clean ALL checkpoint artifacts
    cleaned_code = _aggressive_clean_checkpoints(complete_code)
    print(f"   [EXTRACTOR] ✅ Cleaned code: {len(cleaned_code)} chars")
    
    # Validate before returning
    if not _is_code_roughly_valid(cleaned_code):
        print(f"   [EXTRACTOR] ❌ Validation failed - code not valid")
        print(f"   [EXTRACTOR] Last 500 chars of invalid code:")
        print(f"   {repr(cleaned_code[-500:])}")
        return None
    
    print(f"   [EXTRACTOR] ✅ Validation passed")
    return cleaned_code


def _aggressive_clean_checkpoints(code: str) -> str:
    """
    Aggressively remove ALL checkpoint markers and artifacts.
    
    This handles various malformed checkpoint patterns:
    - /*CHECKPOINT...*/
    - //$CHECKPOINT
    - Incomplete /*CHECKPOINT without closing
    - Trailing whitespace after checkpoint removal
    - Multiple consecutive newlines
    
    Args:
        code: Code potentially containing checkpoint markers
        
    Returns:
        Clean code without any checkpoint artifacts
    """
    print(f"   [CLEANER] Starting aggressive cleanup...")
    original_length = len(code)
    
    # Step 1: Remove all /*CHECKPOINT...*/  blocks (multiline, greedy)
    code = re.sub(r'/\*CHECKPOINT.*?\*/', '', code, flags=re.DOTALL)
    print(f"   [CLEANER] After removing /*CHECKPOINT...*/: {len(code)} chars (removed {original_length - len(code)})")
    
    # Step 2: Remove all //$CHECKPOINT lines
    code = re.sub(r'//\$CHECKPOINT\s*\n?', '', code)
    print(f"   [CLEANER] After removing //$CHECKPOINT: {len(code)} chars")
    
    # Step 3: Handle incomplete checkpoint comments (no closing */)
    # Pattern: /*CHECKPOINT followed by text but no */
    code = re.sub(r'/\*CHECKPOINT[^*]*(?!\*/)', '', code)
    print(f"   [CLEANER] After removing incomplete /*CHECKPOINT: {len(code)} chars")
    
    # Step 4: Remove any orphaned */ that might be left
    # This is aggressive but necessary - look for */ not preceded by /*
    # Only remove if it's on its own line or surrounded by whitespace
    code = re.sub(r'^\s*\*/\s*$', '', code, flags=re.MULTILINE)
    print(f"   [CLEANER] After removing orphaned */: {len(code)} chars")
    
    # Step 5: Clean up excessive whitespace
    # Replace 3+ consecutive newlines with 2 newlines
    code = re.sub(r'\n{3,}', '\n\n', code)
    
    # Step 6: Remove trailing whitespace from each line
    code = '\n'.join(line.rstrip() for line in code.split('\n'))
    
    # Step 7: Final trim
    code = code.strip()
    
    print(f"   [CLEANER] ✅ Final cleaned code: {len(code)} chars (total removed: {original_length - len(code)})")
    
    return code


def _is_code_roughly_valid(code: str) -> bool:
    """
    Validate that code is roughly syntactically valid.
    
    Checks:
    - Balanced braces, parens, brackets
    - Balanced JSX comments
    - Has required React structure
    - Proper ending
    
    Args:
        code: Code to validate
        
    Returns:
        True if code passes basic validation checks
    """
    print(f"   [VALIDATOR] Starting validation...")
    
    # Check 1: Balanced braces
    brace_count = code.count('{') - code.count('}')
    print(f"   [VALIDATOR] Brace balance: {brace_count} (should be 0)")
    if brace_count != 0:
        print(f"   [VALIDATOR] ❌ Unbalanced braces")
        return False
    
    # Check 2: Balanced parens
    paren_count = code.count('(') - code.count(')')
    print(f"   [VALIDATOR] Paren balance: {paren_count} (should be 0)")
    if paren_count != 0:
        print(f"   [VALIDATOR] ❌ Unbalanced parentheses")
        return False
    
    # Check 3: Balanced brackets
    bracket_count = code.count('[') - code.count(']')
    print(f"   [VALIDATOR] Bracket balance: {bracket_count} (should be 0)")
    if bracket_count != 0:
        print(f"   [VALIDATOR] ❌ Unbalanced brackets")
        return False
    
    # Check 4: Balanced JSX comments
    jsx_comment_start = code.count('{/*')
    jsx_comment_end = code.count('*/}')
    print(f"   [VALIDATOR] JSX comment balance: {jsx_comment_start} vs {jsx_comment_end}")
    if jsx_comment_start != jsx_comment_end:
        print(f"   [VALIDATOR] ❌ Unbalanced JSX comments")
        return False
    
    # Check 5: Has React structure
    if 'export default function' not in code:
        print(f"   [VALIDATOR] ❌ Missing 'export default function'")
        return False
    
    if 'return (' not in code and 'return(' not in code:
        print(f"   [VALIDATOR] ❌ Missing return statement")
        return False
    
    # Check 6: Proper ending
    if not code.strip().endswith('}'):
        print(f"   [VALIDATOR] ❌ Code doesn't end with '}}'")
        print(f"   [VALIDATOR] Last 100 chars: {repr(code[-100:])}")
        return False
    
    # Check 7: No checkpoint artifacts remaining
    if '/*CHECKPOINT' in code or '//$CHECKPOINT' in code:
        print(f"   [VALIDATOR] ❌ Checkpoint markers still present in code")
        return False
    
    print(f"   [VALIDATOR] ✅ All validation checks passed")
    return True


def count_checkpoints(buffer: str) -> int:
    """
    Count how many checkpoints have been hit so far.
    
    Args:
        buffer: Accumulated code from LLM stream
        
    Returns:
        Number of checkpoints encountered
    """
    return buffer.count('//$CHECKPOINT')


def has_new_checkpoint(buffer: str, last_checkpoint_count: int) -> bool:
    """
    Check if a new checkpoint has been added since last check.
    
    Args:
        buffer: Accumulated code from LLM stream
        last_checkpoint_count: Previous checkpoint count
        
    Returns:
        True if new checkpoint detected
    """
    current_count = count_checkpoints(buffer)
    return current_count > last_checkpoint_count