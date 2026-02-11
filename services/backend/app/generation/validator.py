"""
Taste Validator - Validates generated code adheres to taste constraints

This is part of the 10x taste system. It checks if generated code:
1. Uses only approved colors from DTM
2. Uses only approved fonts and weights
3. Uses only approved spacing values
4. Follows the spacing quantum

Returns violations so we can:
- Log them for analysis
- Potentially retry generation
- Measure taste fidelity over time
"""

import re
from typing import Dict, Any, List, Set
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """Result of taste validation"""
    passed: bool
    violations: List[str]
    warnings: List[str]
    stats: Dict[str, Any]


class TasteValidator:
    """Validates generated code adheres to taste constraints"""
    
    def __init__(self, taste_data: Dict[str, Any]):
        """
        Args:
            taste_data: DTM or DTR data containing exact tokens
        """
        self.taste_data = taste_data
        
        # Extract approved tokens
        exact_tokens = taste_data.get("consolidated_tokens", taste_data.get("exact_tokens", {}))
        
        self.approved_colors = self._extract_approved_colors(exact_tokens.get("colors", {}))
        self.approved_fonts = self._extract_approved_fonts(exact_tokens.get("typography", {}))
        self.approved_spacing = self._extract_approved_spacing(exact_tokens.get("spacing", {}))
        self.spacing_quantum = exact_tokens.get("spacing", {}).get("quantum", "4px")
    
    def validate(self, code: str) -> ValidationResult:
        """
        Validate generated code against taste constraints
        
        Args:
            code: Generated React code
        
        Returns:
            ValidationResult with violations and warnings
        """
        violations = []
        warnings = []
        stats = {
            "total_colors_used": 0,
            "unapproved_colors": 0,
            "total_fonts_used": 0,
            "unapproved_fonts": 0,
            "total_spacing_values": 0,
            "unapproved_spacing": 0,
        }
        
        # Check colors
        color_violations = self._check_colors(code)
        violations.extend(color_violations)
        stats["total_colors_used"] = len(self._extract_colors_from_code(code))
        stats["unapproved_colors"] = len(color_violations)
        
        # Check fonts
        font_violations = self._check_fonts(code)
        violations.extend(font_violations)
        stats["total_fonts_used"] = len(self._extract_fonts_from_code(code))
        stats["unapproved_fonts"] = len(font_violations)
        
        # Check spacing
        spacing_violations = self._check_spacing_scale(code)
        violations.extend(spacing_violations)
        stats["total_spacing_values"] = len(self._extract_spacing_from_code(code))
        stats["unapproved_spacing"] = len(spacing_violations)
        
        # Check quantum adherence
        quantum_warnings = self._check_quantum_adherence(code)
        warnings.extend(quantum_warnings)
        
        return ValidationResult(
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            stats=stats
        )
    
    def _extract_approved_colors(self, colors: Dict[str, Any]) -> Set[str]:
        """Extract set of approved hex colors"""
        approved = set()
        
        exact_palette = colors.get("exact_palette", [])
        for color in exact_palette:
            hex_val = color.get("hex", "").upper()
            if hex_val:
                # Normalize to uppercase without #
                hex_clean = hex_val.replace("#", "").upper()
                approved.add(hex_clean)
        
        return approved
    
    def _extract_approved_fonts(self, typography: Dict[str, Any]) -> Set[str]:
        """Extract set of approved font families"""
        approved = set()
        
        families = typography.get("families", [])
        for family in families:
            name = family.get("name", family.get("family_name", ""))
            if name:
                # Normalize font names (remove quotes, lowercase)
                normalized = name.replace('"', '').replace("'", "").lower()
                approved.add(normalized)
        
        return approved
    
    def _extract_approved_spacing(self, spacing: Dict[str, Any]) -> Set[int]:
        """Extract set of approved spacing values in px"""
        approved = set()
        
        scale = spacing.get("scale", [])
        for value in scale:
            if isinstance(value, (int, float)):
                approved.add(int(value))
        
        return approved
    
    def _extract_colors_from_code(self, code: str) -> Set[str]:
        """Extract all hex colors used in code"""
        # Match hex colors: #RGB, #RRGGBB, #RRGGBBAA
        pattern = r'["\']#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})["\']'
        matches = re.findall(pattern, code)
        
        # Normalize to 6-digit uppercase
        normalized = set()
        for match in matches:
            if len(match) == 3:
                # Expand #RGB to #RRGGBB
                expanded = ''.join([c*2 for c in match])
                normalized.add(expanded.upper())
            elif len(match) == 6:
                normalized.add(match.upper())
            elif len(match) == 8:
                # Strip alpha channel for comparison
                normalized.add(match[:6].upper())
        
        return normalized
    
    def _extract_fonts_from_code(self, code: str) -> Set[str]:
        """Extract all font families used in code"""
        # Match fontFamily: "...", fontFamily: '...'
        pattern = r'fontFamily:\s*["\']([^"\']+)["\']'
        matches = re.findall(pattern, code)
        
        # Normalize (lowercase, no quotes)
        normalized = set()
        for match in matches:
            # Split by comma for font stacks
            fonts = match.split(',')
            for font in fonts:
                cleaned = font.strip().replace('"', '').replace("'", "").lower()
                if cleaned and cleaned not in ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy']:
                    # Skip generic font families
                    normalized.add(cleaned)
        
        return normalized
    
    def _extract_spacing_from_code(self, code: str) -> Set[int]:
        """Extract all spacing values (px) used in code"""
        # Match padding, margin, gap values: 16px, "16px", '16px'
        pattern = r'(?:padding|margin|gap|width|height|top|right|bottom|left):\s*["\']?(\d+)px["\']?'
        matches = re.findall(pattern, code)
        
        return set(int(m) for m in matches)
    
    def _check_colors(self, code: str) -> List[str]:
        """Check if code uses only approved colors"""
        violations = []
        
        used_colors = self._extract_colors_from_code(code)
        
        for color in used_colors:
            if color not in self.approved_colors:
                violations.append(f"Unapproved color: #{color} (not in taste palette)")
        
        return violations
    
    def _check_fonts(self, code: str) -> List[str]:
        """Check if code uses only approved fonts"""
        violations = []
        
        used_fonts = self._extract_fonts_from_code(code)
        
        for font in used_fonts:
            if font not in self.approved_fonts:
                violations.append(f"Unapproved font: {font} (not in taste typography)")
        
        return violations
    
    def _check_spacing_scale(self, code: str) -> List[str]:
        """Check if spacing values are in approved scale"""
        violations = []
        
        used_spacing = self._extract_spacing_from_code(code)
        
        for value in used_spacing:
            if value not in self.approved_spacing:
                violations.append(f"Unapproved spacing: {value}px (not in taste scale)")
        
        return violations
    
    def _check_quantum_adherence(self, code: str) -> List[str]:
        """Check if spacing adheres to quantum (warnings, not violations)"""
        warnings = []
        
        # Extract quantum value (e.g., "4px" -> 4)
        quantum_match = re.search(r'(\d+)', self.spacing_quantum)
        if not quantum_match:
            return warnings
        
        quantum = int(quantum_match.group(1))
        
        used_spacing = self._extract_spacing_from_code(code)
        
        for value in used_spacing:
            if value % quantum != 0:
                warnings.append(
                    f"Spacing {value}px doesn't align with quantum {quantum}px "
                    f"(should be multiple of {quantum})"
                )
        
        return warnings
    
    def get_fidelity_score(self, validation_result: ValidationResult) -> float:
        """
        Calculate taste fidelity score (0-100)
        
        100 = Perfect adherence
        0 = Complete violation
        """
        stats = validation_result.stats
        
        # Calculate per-category scores
        color_score = 0.0
        if stats["total_colors_used"] > 0:
            color_score = 1.0 - (stats["unapproved_colors"] / stats["total_colors_used"])
        else:
            color_score = 1.0  # No colors used = no violations
        
        font_score = 0.0
        if stats["total_fonts_used"] > 0:
            font_score = 1.0 - (stats["unapproved_fonts"] / stats["total_fonts_used"])
        else:
            font_score = 1.0
        
        spacing_score = 0.0
        if stats["total_spacing_values"] > 0:
            spacing_score = 1.0 - (stats["unapproved_spacing"] / stats["total_spacing_values"])
        else:
            spacing_score = 1.0
        
        # Weighted average (colors and spacing are most important)
        fidelity = (
            color_score * 0.4 +      # 40% weight
            spacing_score * 0.4 +     # 40% weight
            font_score * 0.2          # 20% weight
        )
        
        return fidelity * 100  # Convert to 0-100 scale
