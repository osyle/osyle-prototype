"""
Figma JSON Parser for DTR Extraction

Extracts structural design properties from Figma JSON exported via plugin.
The plugin exports a single root FRAME node with a complete children tree.

Pass 1 Focus: Layout topology, hierarchy, content density, spacing system
"""
from typing import Dict, List, Any, Optional, Tuple, Set
import statistics
from collections import Counter
import math


class FigmaParser:
    """
    Parse Figma JSON and extract structural properties deterministically.
    
    Works with the Figma plugin export format where the JSON is a root FRAME node
    with a 'children' array containing the complete node tree.
    
    Pass 1 Extractions:
    - Layout topology (columns, auto-layout direction, nesting depth)
    - Hierarchy (heading levels based on text size, position, weight)
    - Content density (content vs empty space per section)
    - Spacing system (quantum/base unit, scale, consistency)
    """
    
    def __init__(self, figma_json: Dict[str, Any]):
        """
        Initialize parser with Figma JSON root node.
        
        Args:
            figma_json: Root node from Figma plugin export (type: FRAME)
        """
        self.root = figma_json
        self.all_nodes = []
        self.frames = []
        self.text_nodes = []
        self.image_nodes = []
        self.spacing_values = []
        
        # Collect all nodes with depth tracking
        self._collect_nodes(figma_json, depth=0)
    
    def _collect_nodes(self, node: Any, depth: int = 0) -> None:
        """Recursively collect all nodes with depth tracking"""
        if not isinstance(node, dict):
            return
        
        # Add depth for hierarchy analysis
        node['_depth'] = depth
        self.all_nodes.append(node)
        
        # Categorize by type
        node_type = node.get('type', '')
        if node_type == 'FRAME':
            self.frames.append(node)
        elif node_type == 'TEXT':
            self.text_nodes.append(node)
        
        # Check for image fills (RECTANGLE or ELLIPSE with IMAGE fill)
        if node_type in ['RECTANGLE', 'ELLIPSE', 'VECTOR']:
            fills = node.get('fills', [])
            for fill in fills:
                if fill.get('type') == 'IMAGE':
                    self.image_nodes.append(node)
                    break
        
        # Collect spacing values from this node
        self._collect_spacing_from_node(node)
        
        # Recurse into children
        if 'children' in node:
            for child in node.get('children', []):
                self._collect_nodes(child, depth + 1)
    
    def _collect_spacing_from_node(self, node: Dict[str, Any]) -> None:
        """Extract spacing values from a single node"""
        # Padding values
        for key in ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']:
            val = node.get(key)
            if val is not None and val > 0:
                self.spacing_values.append(val)
        
        # Item spacing (gap in auto-layout)
        item_spacing = node.get('itemSpacing')
        if item_spacing is not None and item_spacing > 0:
            self.spacing_values.append(item_spacing)
    
    # ========================================================================
    # PASS 1: STRUCTURAL SKELETON EXTRACTION
    # ========================================================================
    
    def extract_structure(self) -> Dict[str, Any]:
        """
        Main Pass 1 extraction method.
        
        Returns:
            Dict with layout, hierarchy, density, spacing data
        """
        layout = self._extract_layout()
        hierarchy = self._extract_hierarchy()
        density = self._extract_density()
        spacing = self._extract_spacing_system()
        
        return {
            "layout": layout,
            "hierarchy": hierarchy,
            "density": density,
            "spacing": spacing
        }
    
    # ========================================================================
    # LAYOUT TOPOLOGY
    # ========================================================================
    
    def _extract_layout(self) -> Dict[str, Any]:
        """
        Extract layout topology from the design.
        
        Analyzes:
        - Overall layout pattern (sidebar+content, hero sections, grid, etc.)
        - Column structure
        - Primary direction (horizontal/vertical)
        - Nesting depth
        """
        # Detect high-level layout pattern
        layout_type = self._detect_layout_pattern(self.root)
        
        # Extract column info
        columns = self._extract_columns(self.root)
        
        # Get primary direction from root's layoutMode
        direction = "vertical"  # Default
        layout_mode = self.root.get('layoutMode')
        if layout_mode == 'HORIZONTAL':
            direction = "horizontal"
        elif layout_mode == 'VERTICAL':
            direction = "vertical"
        elif layout_mode == 'NONE':
            direction = "free"  # Absolute positioning
        
        # Calculate max nesting depth
        max_depth = max([n.get('_depth', 0) for n in self.all_nodes], default=0)
        
        return {
            "type": layout_type,
            "columns": columns,
            "direction": direction,
            "nesting_depth": max_depth
        }
    
    def _detect_layout_pattern(self, node: Dict[str, Any]) -> str:
        """
        Detect high-level layout pattern.
        
        Patterns:
        - sidebar_content: Two main vertical sections side-by-side
        - hero_sections: Full-width vertically stacked sections
        - card_grid: Grid of similar-sized elements
        - single_column: One main vertical flow
        """
        children = node.get('children', [])
        
        if not children:
            return "single_column"
        
        # Check for sidebar pattern (2 children arranged horizontally)
        if len(children) == 2:
            if node.get('layoutMode') == 'HORIZONTAL':
                return "sidebar_content"
        
        # Check for card grid (4+ similar-sized children)
        if len(children) >= 4:
            if self._is_grid_layout(children):
                return "card_grid"
        
        # Check for hero sections (full-width vertical stack)
        if len(children) >= 2:
            if self._is_sections_layout(children):
                return "hero_sections"
        
        return "single_column"
    
    def _is_grid_layout(self, children: List[Dict[str, Any]]) -> bool:
        """Check if children form a grid (similar sizes)"""
        if len(children) < 4:
            return False
        
        # Get areas
        areas = []
        for child in children:
            w = child.get('width', 0)
            h = child.get('height', 0)
            if w > 0 and h > 0:
                areas.append(w * h)
        
        if len(areas) < 4:
            return False
        
        # Check if sizes are similar (low variance)
        avg_area = statistics.mean(areas)
        if avg_area == 0:
            return False
        
        variance = statistics.variance(areas) if len(areas) > 1 else 0
        coefficient_of_variation = (variance ** 0.5) / avg_area
        
        # Low CV = similar sizes = likely grid
        return coefficient_of_variation < 0.3
    
    def _is_sections_layout(self, children: List[Dict[str, Any]]) -> bool:
        """Check if children are full-width sections"""
        if len(children) < 2:
            return False
        
        # Check if children are vertically stacked with similar widths
        widths = [child.get('width', 0) for child in children if child.get('width', 0) > 0]
        
        if len(widths) < 2:
            return False
        
        # Similar widths = likely full-width sections
        avg_width = statistics.mean(widths)
        max_deviation = max(abs(w - avg_width) for w in widths)
        
        # Allow 10% deviation
        return max_deviation < (avg_width * 0.1)
    
    def _extract_columns(self, node: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract column structure if present.
        
        Returns column count, widths, and gap
        """
        children = node.get('children', [])
        
        if not children:
            return None
        
        # Check if this is a horizontal layout (columns)
        if node.get('layoutMode') == 'HORIZONTAL':
            widths = [c.get('width', 0) for c in children if c.get('width', 0) > 0]
            gap = node.get('itemSpacing', 0)
            
            return {
                "count": len(widths),
                "widths": widths,
                "gap": f"{gap}px"
            }
        
        # Check if any child has horizontal layout
        for child in children:
            if child.get('layoutMode') == 'HORIZONTAL':
                grandchildren = child.get('children', [])
                if grandchildren:
                    widths = [gc.get('width', 0) for gc in grandchildren if gc.get('width', 0) > 0]
                    gap = child.get('itemSpacing', 0)
                    return {
                        "count": len(widths),
                        "widths": widths,
                        "gap": f"{gap}px"
                    }
        
        return None
    
    # ========================================================================
    # HIERARCHY
    # ========================================================================
    
    def _extract_hierarchy(self) -> Dict[str, Any]:
        """
        Extract visual hierarchy based on text nodes.
        
        Analyzes:
        - Text size
        - Font weight
        - Position (y-coordinate)
        - Nesting level
        
        Returns hierarchy levels ranked by prominence
        """
        if not self.text_nodes:
            return {"levels": []}
        
        # Group text nodes by size
        size_groups = {}
        for node in self.text_nodes:
            size = node.get('fontSize', 16)
            if size not in size_groups:
                size_groups[size] = []
            size_groups[size].append(node)
        
        # Sort sizes descending (largest = most prominent)
        sorted_sizes = sorted(size_groups.keys(), reverse=True)
        
        # Build hierarchy levels
        levels = []
        for rank, size in enumerate(sorted_sizes[:5], start=1):  # Top 5 levels
            nodes = size_groups[size]
            
            # Classify what these represent
            element_type = self._classify_text_nodes(nodes)
            
            # Determine how hierarchy is established
            method = self._determine_hierarchy_method(nodes, size)
            
            levels.append({
                "rank": rank,
                "elements": [element_type],
                "established_by": method,
                "size_px": size,
                "count": len(nodes)
            })
        
        return {"levels": levels}
    
    def _classify_text_nodes(self, nodes: List[Dict[str, Any]]) -> str:
        """Classify what type of elements these text nodes represent"""
        if not nodes:
            return "unknown"
        
        # Get first node for size-based classification
        first_node = nodes[0]
        size = first_node.get('fontSize', 16)
        weight = first_node.get('fontWeight', 400)
        
        # Check node names for hints
        names = [n.get('name', '').lower() for n in nodes]
        
        # Name-based classification (most specific)
        if any(term in name for name in names for term in ['heading', 'title', 'hero', 'h1']):
            return "hero_heading"
        if any(term in name for name in names for term in ['h2', 'h3', 'subtitle', 'subhead', 'section']):
            return "section_headings"
        if any(term in name for name in names for term in ['nav', 'menu', 'link']):
            return "navigation"
        if any(term in name for name in names for term in ['button', 'cta', 'btn']):
            return "buttons"
        if any(term in name for name in names for term in ['label', 'caption', 'tag']):
            return "labels"
        if any(term in name for name in names for term in ['body', 'paragraph', 'description', 'content']):
            return "body_text"
        
        # Size + weight-based classification (fallback)
        if size >= 48:
            return "hero_heading"
        elif size >= 32:
            return "section_headings"
        elif size >= 24:
            return "subheadings"
        elif size >= 18:
            return "large_body"
        elif weight >= 600:
            return "emphasized_text"
        else:
            return "body_text"
    
    def _determine_hierarchy_method(self, nodes: List[Dict[str, Any]], size: float) -> str:
        """Determine how hierarchy is established for these nodes"""
        methods = []
        
        # Size is primary factor
        if size > 32:
            methods.append("size")
        
        # Check for weight
        weights = [n.get('fontWeight', 400) for n in nodes]
        if any(w >= 600 for w in weights):
            methods.append("weight")
        
        # Check for position (near top of viewport)
        y_positions = [n.get('y', 0) for n in nodes]
        if y_positions and min(y_positions) < 200:
            methods.append("position")
        
        # Check for nesting depth (less nested = more prominent)
        depths = [n.get('_depth', 0) for n in nodes]
        if depths and min(depths) <= 2:
            methods.append("hierarchy_level")
        
        return " + ".join(methods) if methods else "size"
    
    # ========================================================================
    # CONTENT DENSITY
    # ========================================================================
    
    def _extract_density(self) -> Dict[str, Any]:
        """
        Extract content density: ratio of content to empty space.
        
        Analyzes:
        - Global density (entire design)
        - Per-section density (top-level sections)
        """
        # Get root dimensions
        root_width = self.root.get('width', 0)
        root_height = self.root.get('height', 0)
        
        if root_width == 0 or root_height == 0:
            return {
                "global": 0.5,
                "per_section": []
            }
        
        total_area = root_width * root_height
        
        # Calculate content area (sum of all visible leaf nodes)
        content_area = self._calculate_content_area(self.root)
        
        # Cap density at 1.0 (can exceed due to overlapping elements)
        global_density = min(content_area / total_area, 1.0) if total_area > 0 else 0.5
        
        # Per-section density (analyze top-level children)
        per_section = []
        children = self.root.get('children', [])
        
        for i, child in enumerate(children):
            child_width = child.get('width', 0)
            child_height = child.get('height', 0)
            child_area = child_width * child_height
            
            if child_area > 0:
                child_content = self._calculate_content_area(child)
                # Cap at 1.0 to handle overlapping elements
                density = min(child_content / child_area, 1.0)
                
                # Use node name or fallback to index
                section_name = child.get('name', f'section_{i}')
                
                per_section.append({
                    "section": section_name,
                    "density": round(density, 2)
                })
        
        return {
            "global": round(global_density, 2),
            "per_section": per_section
        }
    
    def _calculate_content_area(self, node: Dict[str, Any]) -> float:
        """
        Recursively calculate total content area.
        
        Content = visible leaf nodes (TEXT, shapes with fills, images)
        Only counts leaf nodes to avoid double-counting.
        """
        node_type = node.get('type', '')
        visible = node.get('visible', True)
        
        if not visible:
            return 0.0
        
        width = node.get('width', 0)
        height = node.get('height', 0)
        area = width * height
        
        # If this is a container with children, sum children (don't count self)
        children = node.get('children', [])
        if children:
            total = 0.0
            for child in children:
                total += self._calculate_content_area(child)
            return total
        
        # Leaf nodes: count their area
        
        # Text nodes
        if node_type == 'TEXT':
            return area
        
        # Shapes with fills
        if node_type in ['RECTANGLE', 'ELLIPSE', 'VECTOR', 'STAR', 'POLYGON']:
            fills = node.get('fills', [])
            if fills and any(f.get('visible', True) for f in fills):
                return area
        
        # Images
        if node_type == 'IMAGE':
            return area
        
        # Other leaf nodes (e.g., INSTANCE without children)
        if node_type in ['INSTANCE', 'COMPONENT']:
            return area
        
        return 0.0
    
    # ========================================================================
    # SPACING SYSTEM
    # ========================================================================
    
    def _extract_spacing_system(self) -> Dict[str, Any]:
        """
        Extract spacing system from the design.
        
        Analyzes:
        - Quantum (base unit: 4px, 8px, etc.)
        - Scale (multiples used)
        - Consistency (how consistently the system is applied)
        """
        if not self.spacing_values:
            return {
                "quantum": "8px",
                "scale": [8, 16, 24, 32],
                "consistency": 0.5
            }
        
        # Detect quantum (base unit)
        quantum = self._detect_quantum()
        
        # Build scale
        scale = self._build_scale(quantum)
        
        # Calculate consistency
        consistency = self._calculate_consistency(quantum)
        
        return {
            "quantum": f"{int(quantum)}px",
            "scale": scale,
            "consistency": round(consistency, 2)
        }
    
    def _detect_quantum(self) -> float:
        """
        Detect the base spacing unit (quantum).
        
        Tries common quanta (4px, 8px) and picks the best fit.
        """
        # Filter positive values only
        positive_values = [v for v in self.spacing_values if v > 0]
        
        if not positive_values:
            return 8.0
        
        # Try common quanta
        best_quantum = 8.0
        best_score = 0.0
        
        for quantum in [4.0, 8.0, 5.0, 10.0]:
            score = self._quantum_score(positive_values, quantum)
            if score > best_score:
                best_score = score
                best_quantum = quantum
        
        return best_quantum
    
    def _quantum_score(self, values: List[float], quantum: float) -> float:
        """
        Score how well a quantum fits the values.
        
        Returns: ratio of values that are multiples of quantum
        """
        if not values:
            return 0.0
        
        divisible_count = sum(1 for v in values if v % quantum == 0)
        return divisible_count / len(values)
    
    def _build_scale(self, quantum: float) -> List[int]:
        """
        Build spacing scale from observed values.
        
        Returns: sorted list of unique multiples of quantum
        """
        # Collect multiples
        multiples = set()
        for value in self.spacing_values:
            if value > 0 and value % quantum == 0:
                multiples.add(int(value))
        
        # Sort and limit
        scale = sorted(list(multiples))
        
        # Ensure minimum scale
        if not scale:
            scale = [int(quantum * i) for i in [1, 2, 3, 4, 6, 8]]
        
        return scale[:12]  # Max 12 values
    
    def _calculate_consistency(self, quantum: float) -> float:
        """
        Calculate how consistently the spacing system is used.
        
        Returns: ratio of spacing values that align to quantum (with tolerance)
        """
        if not self.spacing_values:
            return 0.5
        
        # Allow 2px tolerance for real-world designs
        # (designers often make tiny manual adjustments)
        tolerance = 2.0
        
        aligned_count = sum(
            1 for v in self.spacing_values
            if v == 0 or abs(v % quantum) <= tolerance or abs(v % quantum - quantum) <= tolerance
        )
        
        return aligned_count / len(self.spacing_values)
    
    # ========================================================================
    # PASS 2: SURFACE TREATMENT EXTRACTION
    # ========================================================================
    
    def extract_surface(self) -> Dict[str, Any]:
        """
        Main Pass 2 extraction method.
        
        Extracts colors, effects, gradients, shadows from Figma JSON.
        
        Returns:
            Dict with colors, effects, materials data (to be analyzed by LLM)
        """
        colors = self._extract_colors()
        effects = self._extract_effects()
        gradients = self._extract_gradients()
        shadows = self._extract_shadows()
        interactions = self._extract_interactions()
        
        return {
            "colors": colors,
            "effects": effects,
            "gradients": gradients,
            "shadows": shadows,
            "interactions": interactions
        }
    
    def _extract_colors(self) -> Dict[str, Any]:
        """
        Extract all colors with exact hex values, frequency, and contexts.
        
        Returns:
            Dict with palette, frequency map, context map
        """
        color_frequency = Counter()
        color_contexts = {}  # hex -> list of contexts (fill, text, border, shadow)
        
        for node in self.all_nodes:
            # Fills (backgrounds, shape fills)
            fills = node.get('fills', [])
            for fill in fills:
                if isinstance(fill, dict) and fill.get('type') == 'SOLID':
                    color = fill.get('color')
                    if color:
                        hex_color = self._rgba_to_hex(color)
                        color_frequency[hex_color] += 1
                        if hex_color not in color_contexts:
                            color_contexts[hex_color] = set()
                        color_contexts[hex_color].add('fill')
            
            # Strokes (borders)
            strokes = node.get('strokes', [])
            for stroke in strokes:
                if isinstance(stroke, dict) and stroke.get('type') == 'SOLID':
                    color = stroke.get('color')
                    if color:
                        hex_color = self._rgba_to_hex(color)
                        color_frequency[hex_color] += 1
                        if hex_color not in color_contexts:
                            color_contexts[hex_color] = set()
                        color_contexts[hex_color].add('border')
            
            # Text colors
            if node.get('type') == 'TEXT':
                fills = node.get('fills', [])
                for fill in fills:
                    if isinstance(fill, dict) and fill.get('type') == 'SOLID':
                        color = fill.get('color')
                        if color:
                            hex_color = self._rgba_to_hex(color)
                            color_frequency[hex_color] += 1
                            if hex_color not in color_contexts:
                                color_contexts[hex_color] = set()
                            color_contexts[hex_color].add('text')
            
            # Effects (shadow colors)
            effects = node.get('effects', [])
            for effect in effects:
                if isinstance(effect, dict) and 'color' in effect:
                    color = effect.get('color')
                    if color:
                        hex_color = self._rgba_to_hex(color)
                        color_frequency[hex_color] += 1
                        if hex_color not in color_contexts:
                            color_contexts[hex_color] = set()
                        color_contexts[hex_color].add('shadow')
        
        # Build palette sorted by frequency
        palette = []
        for hex_color, freq in color_frequency.most_common():
            palette.append({
                "hex": hex_color,
                "frequency": freq,
                "contexts": sorted(list(color_contexts.get(hex_color, set())))
            })
        
        return {
            "palette": palette,
            "total_colors": len(palette)
        }
    
    def _extract_effects(self) -> List[Dict[str, Any]]:
        """
        Extract all effects (shadows, blurs) with complete parameters.
        
        Returns:
            List of effect definitions
        """
        effects_list = []
        seen_effects = set()  # To avoid duplicates
        
        for node in self.all_nodes:
            effects = node.get('effects', [])
            for effect in effects:
                if not isinstance(effect, dict):
                    continue
                
                effect_type = effect.get('type')
                if not effect_type:
                    continue
                
                # Extract effect based on type
                if effect_type == 'DROP_SHADOW' or effect_type == 'INNER_SHADOW':
                    effect_data = self._parse_shadow_effect(effect)
                    effect_key = effect_data.get('css', '')
                    if effect_key and effect_key not in seen_effects:
                        effects_list.append(effect_data)
                        seen_effects.add(effect_key)
                
                elif effect_type == 'LAYER_BLUR' or effect_type == 'BACKGROUND_BLUR':
                    effect_data = self._parse_blur_effect(effect)
                    effect_key = effect_data.get('css', '')
                    if effect_key and effect_key not in seen_effects:
                        effects_list.append(effect_data)
                        seen_effects.add(effect_key)
        
        return effects_list
    
    def _extract_gradients(self) -> List[Dict[str, Any]]:
        """
        Extract all gradient definitions with complete stops and parameters.
        
        Returns:
            List of gradient definitions
        """
        gradients_list = []
        seen_gradients = set()
        
        for node in self.all_nodes:
            fills = node.get('fills', [])
            for fill in fills:
                if not isinstance(fill, dict):
                    continue
                
                fill_type = fill.get('type')
                if fill_type in ['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR']:
                    gradient_data = self._parse_gradient(fill)
                    gradient_key = gradient_data.get('css', '')
                    if gradient_key and gradient_key not in seen_gradients:
                        gradients_list.append(gradient_data)
                        seen_gradients.add(gradient_key)
        
        return gradients_list
    
    def _extract_shadows(self) -> List[Dict[str, Any]]:
        """
        Extract shadow effects separately for easier access.
        
        Returns:
            List of shadow definitions with CSS
        """
        shadows = []
        seen_shadows = set()
        
        for node in self.all_nodes:
            effects = node.get('effects', [])
            for effect in effects:
                if not isinstance(effect, dict):
                    continue
                
                effect_type = effect.get('type')
                if effect_type in ['DROP_SHADOW', 'INNER_SHADOW']:
                    shadow_data = self._parse_shadow_effect(effect)
                    shadow_key = shadow_data.get('css', '')
                    if shadow_key and shadow_key not in seen_shadows:
                        shadows.append(shadow_data)
                        seen_shadows.add(shadow_key)
        
        return shadows
    
    def _parse_shadow_effect(self, effect: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a shadow effect into CSS.
        
        Args:
            effect: Figma effect object
        
        Returns:
            Dict with type, css, and params
        """
        effect_type = effect.get('type')
        offset_x = effect.get('offset', {}).get('x', 0)
        offset_y = effect.get('offset', {}).get('y', 0)
        radius = effect.get('radius', 0)
        spread = effect.get('spread', 0)
        color = effect.get('color', {})
        
        # Convert color to rgba
        r = int(color.get('r', 0) * 255)
        g = int(color.get('g', 0) * 255)
        b = int(color.get('b', 0) * 255)
        a = color.get('a', 1)
        
        # Build CSS
        if effect_type == 'INNER_SHADOW':
            css = f"box-shadow: inset {offset_x}px {offset_y}px {radius}px {spread}px rgba({r},{g},{b},{a});"
        else:
            css = f"box-shadow: {offset_x}px {offset_y}px {radius}px {spread}px rgba({r},{g},{b},{a});"
        
        return {
            "type": "shadow",
            "css": css,
            "params": {
                "x": offset_x,
                "y": offset_y,
                "blur": radius,
                "spread": spread,
                "color": f"rgba({r},{g},{b},{a})"
            }
        }
    
    def _extract_interactions(self) -> Dict[str, Any]:
        """
        Extract interaction states from Figma component variants.
        
        Looks for:
        - Component sets with variants (hover, pressed, active, etc.)
        - Interactive prototypes with state changes
        - Repeated button/card patterns that suggest interactive design
        
        Returns:
            Dict with component_states and patterns found
        """
        component_states = {}
        component_patterns = []
        
        # Track components by name to find variants
        components_by_base_name = {}
        
        for node in self.all_nodes:
            node_type = node.get('type')
            node_name = node.get('name', '')
            
            # Look for component variants (e.g., "Button/Primary/Hover")
            if node_type in ['COMPONENT', 'INSTANCE', 'COMPONENT_SET']:
                # Check if name contains state keywords
                name_lower = node_name.lower()
                state_keywords = ['hover', 'pressed', 'active', 'disabled', 'focus', 'default', 'normal']
                
                for keyword in state_keywords:
                    if keyword in name_lower:
                        # Extract base component name
                        base_name = node_name.lower().replace(keyword, '').replace('/', '').replace('\\', '').strip()
                        
                        if base_name not in components_by_base_name:
                            components_by_base_name[base_name] = {}
                        
                        # Store this variant
                        components_by_base_name[base_name][keyword] = {
                            'node_id': node.get('id'),
                            'name': node_name,
                            'effects': node.get('effects', []),
                            'fills': node.get('fills', []),
                            'opacity': node.get('opacity', 1.0),
                            'transform': node.get('relativeTransform')
                        }
                        
                        component_patterns.append({
                            'base_name': base_name,
                            'state': keyword,
                            'component_name': node_name
                        })
                        break
        
        # Analyze variants to extract state differences
        for base_name, states in components_by_base_name.items():
            if len(states) > 1:
                # We have multiple states for this component
                component_states[base_name] = self._analyze_state_differences(states)
        
        return {
            'component_states': component_states,
            'patterns': component_patterns,
            'has_variants': len(component_states) > 0
        }
    
    def _analyze_state_differences(self, states: Dict[str, Dict]) -> Dict[str, str]:
        """
        Analyze differences between component states to generate CSS.
        
        Args:
            states: Dict mapping state names to component data
        
        Returns:
            Dict mapping state names to CSS strings
        """
        state_css = {}
        
        # Get default/normal state as baseline
        baseline = states.get('default') or states.get('normal') or list(states.values())[0]
        
        for state_name, state_data in states.items():
            if state_name in ['default', 'normal']:
                continue
            
            css_changes = []
            
            # Compare opacity
            baseline_opacity = baseline.get('opacity', 1.0)
            state_opacity = state_data.get('opacity', 1.0)
            if abs(baseline_opacity - state_opacity) > 0.01:
                css_changes.append(f"opacity: {state_opacity}")
            
            # Compare effects (shadows, blurs)
            baseline_effects = baseline.get('effects', [])
            state_effects = state_data.get('effects', [])
            if len(state_effects) != len(baseline_effects):
                # Effect count changed - likely shadow added/removed
                for effect in state_effects:
                    if effect.get('type') == 'DROP_SHADOW':
                        shadow = self._parse_shadow_effect(effect)
                        css_changes.append(shadow['css'].replace('box-shadow: ', ''))
            
            # Look for transform hints (scale, position changes)
            # Note: Figma doesn't always export these, but we can infer from size changes
            
            if css_changes:
                state_css[f"{state_name}"] = "; ".join(css_changes) + ";"
            else:
                # No detectable changes, use placeholder
                state_css[f"{state_name}"] = "/* No visual changes detected */"
        
        return state_css
    
    def _parse_blur_effect(self, effect: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a blur effect into CSS.
        
        Args:
            effect: Figma effect object
        
        Returns:
            Dict with type, css, and params
        """
        effect_type = effect.get('type')
        radius = effect.get('radius', 0)
        
        if effect_type == 'BACKGROUND_BLUR':
            css = f"backdrop-filter: blur({radius}px);"
        else:
            css = f"filter: blur({radius}px);"
        
        return {
            "type": "blur",
            "css": css,
            "params": {
                "radius": radius
            }
        }
    
    def _parse_gradient(self, fill: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a gradient fill into CSS.
        
        Args:
            fill: Figma gradient fill object
        
        Returns:
            Dict with type, css, params
        """
        fill_type = fill.get('type')
        stops = fill.get('gradientStops', [])
        
        # Convert stops to CSS format
        css_stops = []
        for stop in stops:
            color = stop.get('color', {})
            position = stop.get('position', 0) * 100
            
            r = int(color.get('r', 0) * 255)
            g = int(color.get('g', 0) * 255)
            b = int(color.get('b', 0) * 255)
            a = color.get('a', 1)
            
            css_stops.append(f"rgba({r},{g},{b},{a}) {position:.1f}%")
        
        stops_str = ", ".join(css_stops)
        
        # Build CSS based on gradient type
        if fill_type == 'GRADIENT_LINEAR':
            # Default to 135deg if no handle vectors
            css = f"background: linear-gradient(135deg, {stops_str});"
        elif fill_type == 'GRADIENT_RADIAL':
            css = f"background: radial-gradient(circle, {stops_str});"
        elif fill_type == 'GRADIENT_ANGULAR':
            css = f"background: conic-gradient({stops_str});"
        else:
            css = f"background: linear-gradient({stops_str});"
        
        return {
            "type": "gradient",
            "css": css,
            "params": {
                "gradient_type": fill_type,
                "stops": [
                    {
                        "color": f"rgba({int(s.get('color', {}).get('r', 0)*255)},{int(s.get('color', {}).get('g', 0)*255)},{int(s.get('color', {}).get('b', 0)*255)},{s.get('color', {}).get('a', 1)})",
                        "position": f"{s.get('position', 0) * 100:.1f}%"
                    }
                    for s in stops
                ]
            }
        }
    
    def _rgba_to_hex(self, color: Dict[str, float]) -> str:
        """
        Convert Figma RGBA color (0-1 range) to hex.
        
        Args:
            color: Dict with r, g, b, a keys (0-1 range)
        
        Returns:
            Hex color string (e.g., '#0A0A1A' or '#0A0A1AFF' if alpha < 1)
        """
        r = int(color.get('r', 0) * 255)
        g = int(color.get('g', 0) * 255)
        b = int(color.get('b', 0) * 255)
        a = color.get('a', 1)
        
        if a < 1:
            # Include alpha in hex
            a_hex = int(a * 255)
            return f"#{r:02X}{g:02X}{b:02X}{a_hex:02X}"
        else:
            return f"#{r:02X}{g:02X}{b:02X}"
    
    # ========================================================================
    # PASS 3: TYPOGRAPHY EXTRACTION
    # ========================================================================
    
    def extract_typography(self) -> Dict[str, Any]:
        """
        Main Pass 3 extraction method.
        
        Extracts font families, sizes, weights, line heights, letter spacing,
        and text case patterns from Figma JSON.
        
        Returns:
            Dict with families, sizes, weights, spacing data (to be analyzed by LLM)
        """
        text_nodes = []
        self._collect_text_nodes(self.root, text_nodes)
        
        if not text_nodes:
            # No text found - return minimal data
            return {
                "families": [],
                "sizes": [],
                "weights": {},
                "line_heights": {},
                "letter_spacing": {},
                "case_patterns": {},
                "alignments": {}
            }
        
        # Extract properties from all text nodes
        families = self._extract_font_families(text_nodes)
        sizes = self._extract_font_sizes(text_nodes)
        weights = self._extract_weights(text_nodes)
        line_heights = self._extract_line_heights(text_nodes)
        letter_spacing = self._extract_letter_spacing(text_nodes)
        case_patterns = self._extract_case_patterns(text_nodes)
        alignments = self._extract_alignments(text_nodes)
        
        return {
            "families": families,
            "sizes": sizes,
            "weights": weights,
            "line_heights": line_heights,
            "letter_spacing": letter_spacing,
            "case_patterns": case_patterns,
            "alignments": alignments
        }
    
    def _collect_text_nodes(self, node: Dict[str, Any], collector: List[Dict]):
        """Recursively collect all TEXT nodes"""
        if node.get('type') == 'TEXT' and node.get('visible', True):
            collector.append(node)
        
        for child in node.get('children', []):
            self._collect_text_nodes(child, collector)
    
    def _extract_font_families(self, text_nodes: List[Dict]) -> List[Dict[str, Any]]:
        """
        Extract font families with weights used.
        
        Returns:
            List of {name, weights_used} dicts
        """
        families = {}
        
        for node in text_nodes:
            # Figma exports fontName as {family, style} directly on TEXT nodes
            font_name = node.get('fontName', {})
            family = font_name.get('family')
            weight = node.get('fontWeight', 400)
            
            if family:
                if family not in families:
                    families[family] = set()
                families[family].add(weight)
        
        # Convert to sorted list format
        result = []
        for family, weights in sorted(families.items()):
            result.append({
                "name": family,
                "weights_used": sorted(list(weights))
            })
        
        return result
    
    def _extract_font_sizes(self, text_nodes: List[Dict]) -> List[float]:
        """
        Extract all unique font sizes used.
        
        Returns:
            Sorted list of font sizes in px
        """
        sizes = set()
        
        for node in text_nodes:
            # fontSize is directly on the TEXT node in Figma export
            size = node.get('fontSize')
            if size is not None:
                sizes.add(float(size))
        
        return sorted(list(sizes))
    
    def _extract_weights(self, text_nodes: List[Dict]) -> Dict[str, Any]:
        """
        Extract weight distribution and contexts.
        
        Returns:
            Dict mapping weight to {frequency, contexts}
        """
        weight_data = {}
        
        for node in text_nodes:
            # fontWeight is directly on the TEXT node in Figma export
            weight = str(node.get('fontWeight', 400))
            node_name = node.get('name', '').lower()
            
            if weight not in weight_data:
                weight_data[weight] = {
                    "frequency": 0,
                    "contexts": set()
                }
            
            weight_data[weight]["frequency"] += 1
            
            # Infer context from node name or parent
            context = self._infer_text_context(node, node_name)
            weight_data[weight]["contexts"].add(context)
        
        # Convert sets to sorted lists
        for weight in weight_data:
            weight_data[weight]["contexts"] = sorted(list(weight_data[weight]["contexts"]))
        
        return weight_data
    
    def _extract_line_heights(self, text_nodes: List[Dict]) -> Dict[str, float]:
        """
        Extract line height values by context.
        
        Returns:
            Dict mapping context to line-height value
        """
        line_heights = {}
        
        for node in text_nodes:
            # Figma exports lineHeight as {unit, value}
            line_height_obj = node.get('lineHeight', {})
            font_size = node.get('fontSize', 16)
            node_name = node.get('name', '').lower()
            
            # Extract line height value (in pixels if unit is PIXELS)
            if line_height_obj and font_size > 0:
                unit = line_height_obj.get('unit')
                value = line_height_obj.get('value')
                
                if value is not None:
                    if unit == 'PIXELS':
                        # Calculate ratio
                        ratio = round(value / font_size, 2)
                    elif unit == 'PERCENT':
                        # PERCENT is already a ratio (100 = 1.0)
                        ratio = round(value / 100, 2)
                    else:
                        # AUTO or other - skip
                        continue
                    
                    context = self._infer_text_context(node, node_name)
                    
                    # Store or average if context already exists
                    if context in line_heights:
                        # Average with existing value
                        line_heights[context] = round((line_heights[context] + ratio) / 2, 2)
                    else:
                        line_heights[context] = ratio
        
        return line_heights
    
    def _extract_letter_spacing(self, text_nodes: List[Dict]) -> Dict[str, str]:
        """
        Extract letter spacing values by context.
        
        Returns:
            Dict mapping context to letter-spacing value (e.g., '0.05em', 'normal')
        """
        letter_spacing = {}
        
        for node in text_nodes:
            # Figma exports letterSpacing as {unit, value}
            spacing_obj = node.get('letterSpacing', {})
            font_size = node.get('fontSize', 16)
            node_name = node.get('name', '').lower()
            text_case = node.get('textCase', 'ORIGINAL')
            
            context = self._infer_text_context(node, node_name)
            
            # Extract letter spacing value
            if spacing_obj:
                unit = spacing_obj.get('unit')
                value = spacing_obj.get('value', 0)
                
                if value != 0 and font_size > 0:
                    if unit == 'PIXELS':
                        # Convert pixels to em
                        em_value = round(value / font_size, 3)
                        spacing_str = f"{em_value:.3f}em"
                    elif unit == 'PERCENT':
                        # PERCENT is relative to font size (100 = 1em)
                        em_value = round(value / 100, 3)
                        spacing_str = f"{em_value:.3f}em" if em_value != 0 else "normal"
                    else:
                        spacing_str = "normal"
                else:
                    spacing_str = "normal"
            else:
                spacing_str = "normal"
            
            # Add case context if uppercase
            if text_case == 'UPPER':
                context = f"{context}_uppercase"
            
            letter_spacing[context] = spacing_str
        
        return letter_spacing
    
    def _extract_case_patterns(self, text_nodes: List[Dict]) -> Dict[str, str]:
        """
        Extract text case patterns by context.
        
        Returns:
            Dict mapping context to text case ('uppercase', 'lowercase', 'none')
        """
        case_patterns = {}
        
        for node in text_nodes:
            # textCase is directly on the TEXT node
            text_case = node.get('textCase', 'ORIGINAL')
            node_name = node.get('name', '').lower()
            
            context = self._infer_text_context(node, node_name)
            
            # Convert Figma case to CSS
            if text_case == 'UPPER':
                case_str = 'uppercase'
            elif text_case == 'LOWER':
                case_str = 'lowercase'
            elif text_case == 'TITLE':
                case_str = 'capitalize'
            else:
                case_str = 'none'
            
            case_patterns[context] = case_str
        
        return case_patterns
    
    def _extract_alignments(self, text_nodes: List[Dict]) -> Dict[str, int]:
        """
        Extract text alignment distribution.
        
        Returns:
            Dict mapping alignment to frequency
        """
        alignments = Counter()
        
        for node in text_nodes:
            # textAlignHorizontal is directly on the TEXT node
            alignment = node.get('textAlignHorizontal', 'LEFT')
            alignments[alignment.lower()] += 1
        
        return dict(alignments)
    
    def _infer_text_context(self, node: Dict[str, Any], node_name: str) -> str:
        """
        Infer text context from node properties and name.
        
        Returns:
            Context string like 'body', 'heading', 'button', 'label', etc.
        """
        # fontSize is directly on the TEXT node
        font_size = node.get('fontSize', 16)
        
        # Check name for clues
        if any(kw in node_name for kw in ['button', 'btn', 'cta']):
            return 'button'
        elif any(kw in node_name for kw in ['nav', 'menu', 'tab']):
            return 'navigation'
        elif any(kw in node_name for kw in ['label', 'tag', 'badge']):
            return 'label'
        elif any(kw in node_name for kw in ['caption', 'meta', 'small']):
            return 'caption'
        elif any(kw in node_name for kw in ['hero', 'title', 'h1']):
            return 'hero_heading'
        elif any(kw in node_name for kw in ['heading', 'header', 'h2', 'h3', 'h4']):
            return 'heading'
        elif any(kw in node_name for kw in ['body', 'paragraph', 'text', 'description']):
            return 'body'
        
        # Infer from font size if no name match
        if font_size >= 36:
            return 'hero_heading'
        elif font_size >= 24:
            return 'heading'
        elif font_size >= 14:
            return 'body'
        else:
            return 'caption'
    
    # ========================================================================
    # PASS 4: IMAGE USAGE PATTERNS
    # ========================================================================
    
    def extract_images(self) -> Dict[str, Any]:
        """
        Main Pass 4 extraction method.
        
        Extracts all nodes with IMAGE fills (avatars, photos, illustrations).
        Returns structured metadata about each image node.
        
        Returns:
            Dict with image_nodes list containing position, size, treatment data
        """
        if not self.image_nodes:
            return {
                "has_images": False,
                "image_nodes": []
            }
        
        # Extract metadata for each image node
        nodes_data = []
        for node in self.image_nodes:
            # Get image fill
            image_fill = None
            for fill in node.get('fills', []):
                if fill.get('type') == 'IMAGE':
                    image_fill = fill
                    break
            
            if not image_fill:
                continue
            
            # Extract positioning and sizing
            node_data = {
                "id": node.get('id', ''),  # Node ID for matching with exported images
                "name": node.get('name', 'Unnamed'),
                "type": node.get('type'),
                "x": node.get('x', 0),
                "y": node.get('y', 0),
                "width": node.get('width', 0),
                "height": node.get('height', 0),
                "corner_radius": node.get('cornerRadius', 0),
                "top_left_radius": node.get('topLeftRadius'),
                "top_right_radius": node.get('topRightRadius'),
                "bottom_left_radius": node.get('bottomLeftRadius'),
                "bottom_right_radius": node.get('bottomRightRadius'),
                "opacity": image_fill.get('opacity', 1.0),
                "blend_mode": image_fill.get('blendMode', 'NORMAL'),
                "image_ref": image_fill.get('imageRef', ''),
                "scale_mode": image_fill.get('scaleMode', 'FILL'),
                "visible": node.get('visible', True)
            }
            
            # Extract effects (shadows, blurs, etc.)
            effects = node.get('effects', [])
            if effects:
                node_data["effects"] = [
                    {
                        "type": effect.get('type'),
                        "visible": effect.get('visible', True),
                        "radius": effect.get('radius'),
                        "color": effect.get('color')
                    }
                    for effect in effects
                ]
            
            nodes_data.append(node_data)
        
        return {
            "has_images": len(nodes_data) > 0,
            "image_count": len(nodes_data),
            "image_nodes": nodes_data
        }


# ============================================================================
# PUBLIC API
# ============================================================================

def parse_figma_structure(figma_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse structural information from Figma JSON (Pass 1).
    
    Args:
        figma_json: Root FRAME node from Figma plugin export
    
    Returns:
        Dict with layout, hierarchy, density, spacing data
    """
    parser = FigmaParser(figma_json)
    return parser.extract_structure()


def parse_figma_surface(figma_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse surface treatment from Figma JSON (Pass 2).
    
    Args:
        figma_json: Root FRAME node from Figma plugin export
    
    Returns:
        Dict with colors, effects, gradients, shadows data
    """
    parser = FigmaParser(figma_json)
    return parser.extract_surface()


def parse_figma_typography(figma_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse typography system from Figma JSON (Pass 3).
    
    Args:
        figma_json: Root FRAME node from Figma plugin export
    
    Returns:
        Dict with families, sizes, weights, line heights, letter spacing data
    """
    parser = FigmaParser(figma_json)
    return parser.extract_typography()


def parse_figma_images(figma_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse image usage from Figma JSON (Pass 4).
    
    Args:
        figma_json: Root FRAME node from Figma plugin export
    
    Returns:
        Dict with image_nodes list containing metadata for all IMAGE fills
    """
    parser = FigmaParser(figma_json)
    return parser.extract_images()