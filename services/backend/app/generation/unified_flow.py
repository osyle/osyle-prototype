"""
Unified Flow Generator - FIXED VERSION

Generates multi-screen flows as a SINGLE PROJECT with:
- Shared components (/components/ui/*)  ← FIXED: Now actually generated
- Shared utilities (/lib/*)
- Screen components (/screens/*)
- Router (App.tsx)
"""
from typing import Dict, Any, List
import asyncio

from app.generation.multifile_parser import (
    ensure_default_dependencies,
    normalize_file_paths
)


def generate_shared_components() -> Dict[str, str]:
    """
    Generate complete shadcn/ui component library (50+ components)
    
    Matches what v0/Bolt/Lovable provide - LLM has access to full library.
    
    Returns:
        Dict of filepath -> code for complete shadcn/ui library (50+ components)
    """
    
    # Import complete library
    from app.generation.shadcn_full_library import get_all_shadcn_components
    files = get_all_shadcn_components()
    
    print(f"   ✓ Generated complete shadcn/ui library: {len(files)} files")
    print(f"      Core: Button, Input, Label, Textarea, Checkbox, Radio, Select, Switch, Slider")
    print(f"      Data: Card, Table, Avatar, Badge")
    print(f"      Feedback: Alert, Progress, Skeleton, Toast")
    print(f"      Layout: Separator, AspectRatio, ScrollArea")
    print(f"      Navigation: Tabs, Breadcrumb, Pagination")
    print(f"      Overlays: Dialog, Sheet, Popover, Tooltip")
    print(f"      Interactive: Accordion, Collapsible, Dropdown, Context, Menubar, Command")
    print(f"      Advanced: HoverCard, Toggle, Calendar, Carousel")
    print(f"      Total: {len(files)} components available")
    
    return files


def generate_router_code(
    screens: List[Dict[str, Any]],
    transitions: List[Dict[str, Any]],
    entry_screen_id: str
) -> str:
    """
    Generate App.tsx router code
    
    Args:
        screens: List of screen definitions
        transitions: List of transitions between screens
        entry_screen_id: ID of the entry screen
    
    Returns:
        Router code as string
    """
    
    # Build imports
    imports = ["import { useState } from 'react'"]
    
    for screen in screens:
        screen_id = screen['screen_id']
        # Convert "Login" to "LoginScreen", and handle hyphens/special chars
        # "Step-by-Step Cooking" -> "StepByStepCookingScreen"
        component_name = screen['name'].replace(' ', '').replace('-', '') + 'Screen'
        imports.append(f"import {component_name} from './screens/{component_name}'")
    
    # Build transition map
    transition_map_entries = []
    for trans in transitions:
        trans_id = trans['transition_id']
        to_screen = trans['to_screen_id']
        transition_map_entries.append(f"    '{trans_id}': '{to_screen}'")
    
    transition_map = "{\n" + ",\n".join(transition_map_entries) + "\n  }"
    
    # Build switch cases
    switch_cases = []
    for screen in screens:
        screen_id = screen['screen_id']
        # Same component name sanitization
        component_name = screen['name'].replace(' ', '').replace('-', '') + 'Screen'
        # Use explicit string concatenation to avoid f-string brace escaping issues
        case_code = f"    case '{screen_id}':\n"
        case_code += f"      return <{component_name} onTransition=" + "{handleTransition} />"
        switch_cases.append(case_code)
    
    # Default case (entry screen)
    entry_screen = next(s for s in screens if s['screen_id'] == entry_screen_id)
    entry_component_name = entry_screen['name'].replace(' ', '').replace('-', '') + 'Screen'
    
    default_code = "    default:\n"
    default_code += f"      return <{entry_component_name} onTransition=" + "{handleTransition} />"
    switch_cases.append(default_code)
    
    # Assemble router
    router_code = f"""import {{ useState }} from 'react'
{chr(10).join(imports[1:])}

interface RouterProps {{
  initialScreen?: string
}}

export default function App({{ initialScreen = '{entry_screen_id}' }}: RouterProps) {{
  const [currentScreen, setCurrentScreen] = useState(initialScreen)
  
  const handleTransition = (transitionId: string) => {{
    const transitionMap: Record<string, string> = {transition_map}
    
    const targetScreen = transitionMap[transitionId]
    if (targetScreen) {{
      setCurrentScreen(targetScreen)
    }} else {{
      console.warn(`Unknown transition: ${{transitionId}}`)
    }}
  }}
  
  // Render current screen
  switch (currentScreen) {{
{chr(10).join(switch_cases)}
  }}
}}
"""
    
    return router_code


def assemble_unified_project(
    shared_files: Dict[str, str],
    screen_files: Dict[str, Dict[str, str]],  # screen_id -> files
    router_code: str,
    dependencies: Dict[str, str]
) -> Dict[str, Any]:
    """
    Assemble all files into a unified project structure
    
    Args:
        shared_files: Shared component files
        screen_files: Screen component files (one per screen)
        router_code: Router code
        dependencies: npm dependencies
    
    Returns:
        Unified project structure
    """
    
    all_files = {}
    
    # Add shared files (shadcn/ui components, utils)
    all_files.update(shared_files)
    
    # Add screen files
    for screen_id, files in screen_files.items():
        # Screens should only have one file each (the screen component)
        # If they have more, merge them all
        all_files.update(files)
    
    # Add router
    all_files['/App.tsx'] = router_code
    
    # Normalize paths
    all_files = normalize_file_paths(all_files)
    
    # Ensure dependencies
    all_dependencies = ensure_default_dependencies(dependencies)
    
    return {
        'files': all_files,
        'entry': '/App.tsx',
        'dependencies': all_dependencies
    }


async def generate_unified_flow(
    llm,
    screens: List[Dict[str, Any]],
    transitions: List[Dict[str, Any]],
    entry_screen_id: str,
    dtm: Dict[str, Any],
    device_info: Dict[str, Any],
    taste_source: str,
    websocket=None,
    responsive: bool = True
) -> Dict[str, Any]:
    """
    Generate a unified multi-screen flow as a single project
    
    This is the main entry point for unified flow generation.
    
    Flow:
    1. Generate shared components (shadcn/ui, utils)
    2. Generate screen components in parallel
    3. Generate router
    4. Assemble into unified project
    
    Args:
        llm: LLM service
        screens: List of screen definitions from flow architecture
        transitions: List of transitions
        entry_screen_id: Entry screen ID
        dtm: Designer taste model
        device_info: Device dimensions
        taste_source: Taste source mode
        websocket: Optional websocket for progress updates
        responsive: Enable responsive design (default: True)
    
    Returns:
        {
            'project': {
                'files': {...},
                'entry': '/App.tsx',
                'dependencies': {...}
            },
            'screens': [
                {
                    'screen_id': 'screen_1',
                    'component_path': '/screens/LoginScreen.tsx',
                    'name': 'Login'
                }
            ]
        }
    """
    
    from app.generation.orchestrator import GenerationOrchestrator
    
    print("\n" + "="*80)
    print("UNIFIED FLOW GENERATION - FIXED VERSION")
    print("="*80)
    print(f"Screens: {len(screens)}")
    print(f"Entry: {entry_screen_id}")
    print("="*80 + "\n")
    
    # Step 1: Generate shared components
    print("📦 Step 1: Generating shared components...")
    shared_files = generate_shared_components()
    print(f"   ✓ Generated {len(shared_files)} shared files")
    
    # Step 2: Generate screen components in parallel
    print(f"\n🎨 Step 2: Generating {len(screens)} screen components in parallel...")
    
    orchestrator = GenerationOrchestrator(llm, None)  # No storage needed
    
    async def generate_screen_component(screen: Dict[str, Any], idx: int):
        """Generate a single screen component"""
        screen_id = screen['screen_id']
        screen_name = screen['name']
        # Remove hyphens and spaces to create valid JavaScript identifier
        # "Step-by-Step Cooking" -> "StepByStepCookingScreen"
        component_name = screen_name.replace(' ', '').replace('-', '') + 'Screen'
        component_path = f'/screens/{component_name}.tsx'
        
        print(f"\n  [{idx+1}/{len(screens)}] {screen_name} → {component_path}")
        
        if websocket:
            await websocket.send_json({
                'type': 'progress',
                'stage': 'generating_screen',
                'message': f'Generating {screen_name}...',
                'data': {'screen_id': screen_id, 'progress': idx + 1, 'total': len(screens)}
            })
        
        # Build outgoing transitions for this screen
        outgoing_transitions = [
            t for t in transitions if t.get('from_screen_id') == screen_id
        ]
        
        # Build task description with transitions
        task_with_transitions = screen.get('task_description', screen.get('description', ''))
        
        if outgoing_transitions:
            task_with_transitions += "\n\nOutgoing transitions:\n"
            for trans in outgoing_transitions:
                task_with_transitions += f"- {trans['transition_id']}: {trans.get('label', trans['trigger'])} → {trans['to_screen_id']}\n"
        
        # CRITICAL: Add available components info to task
        task_with_transitions += "\n\nAvailable UI components (import from @/components/ui):\n"
        task_with_transitions += "- Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter\n"
        task_with_transitions += "- Input, Label, Checkbox, Badge, Separator\n"
        task_with_transitions += "\nIMPORTANT: Import these components, do NOT define them inline.\n"
        
        # Generate screen component
        # Note: We use the SCREEN_COMPONENT mode, not the standalone mode
        result = await orchestrator.generate_ui(
            task_description=task_with_transitions,
            taste_data=dtm,
            taste_source=taste_source,
            device_info=device_info,
            flow_context={
                'mode': 'screen_component',  # Tells orchestrator to use screen component prompt
                'screen_id': screen_id,
                'screen_name': screen_name,
                'component_name': component_name,
                'shared_components': list(shared_files.keys())
            },
            rendering_mode='react',
            model='claude-sonnet-4.5',
            validate_taste=bool(dtm),
            websocket=None,  # Don't send checkpoint updates (causes too many messages)
            screen_id=screen_id,
            screen_name=screen_name,
            responsive=responsive  # Pass responsive flag
        )
        
        # Extract the screen component code
        # It should be a single file
        if result.get('output_format') == 'multifile':
            # Find the screen component file
            files = result['files']
            screen_file = files.get(component_path) or files.get('/App.tsx') or list(files.values())[0]
        else:
            # Single file - use the code directly
            screen_file = result['code']
        
        # VALIDATION: Ensure screen code is valid TypeScript, not JSON
        if screen_file.strip().startswith('json\n{') or screen_file.strip().startswith('```json'):
            print(f"   ✗ ERROR: Screen {screen_name} contains JSON instead of TypeScript!")
            print(f"   First 200 chars: {screen_file[:200]}")
            # Try to extract code from malformed JSON
            try:
                # Remove json\n or ```json\n prefix
                json_str = screen_file.replace('json\n', '', 1).replace('```json\n', '', 1).strip('`')
                import json
                data = json.loads(json_str)
                if "files" in data and "/App.tsx" in data["files"]:
                    screen_file = data["files"]["/App.tsx"]
                    print(f"   ✓ Recovered code from JSON wrapper ({len(screen_file)} chars)")
            except Exception as e:
                print(f"   ✗ Could not recover: {e}")
        
        # VALIDATION: Check if code looks like TypeScript
        if not ('export default function' in screen_file or 'export function' in screen_file):
            print(f"   ⚠️  WARNING: Screen {screen_name} doesn't have export statement")
            print(f"   First 300 chars: {screen_file[:300]}")
        
        # VALIDATION: Check for inline component definitions (should not exist)
        if 'const Button = ' in screen_file or 'const Card = ' in screen_file:
            print(f"   ⚠️  WARNING: Screen {screen_name} defines components inline!")
            print(f"   This causes code duplication. Components should be imported.")
        
        # VALIDATION: Check for proper imports
        if '@/components/ui' not in screen_file:
            print(f"   ⚠️  WARNING: Screen {screen_name} doesn't import from @/components/ui")
            print(f"   Expected: import {{ Button }} from '@/components/ui/button'")

        print(f"   ✓ {screen_name} generated ({len(screen_file)} chars)")
        
        # Send screen_ready message to frontend for progressive rendering
        if websocket:
            await websocket.send_json({
                'type': 'screen_ready',
                'data': {
                    'screen_id': screen_id,
                    'ui_code': screen_file,
                    'variation_space': result.get('variation_space')
                }
            })
            print(f"   ✓ Sent screen_ready message for {screen_name}")
        
        return {
            'screen_id': screen_id,
            'component_path': component_path,
            'name': screen_name,
            'code': screen_file
        }
    
    # Generate all screens in parallel
    screen_tasks = [
        generate_screen_component(screen, idx)
        for idx, screen in enumerate(screens)
    ]
    screen_results = await asyncio.gather(*screen_tasks, return_exceptions=True)
    
    # Process results
    screen_files = {}
    screen_metadata = []
    
    for result in screen_results:
        if isinstance(result, Exception):
            print(f"   ✗ Screen generation failed: {result}")
            continue
        
        screen_id = result['screen_id']
        component_path = result['component_path']
        code = result['code']
        
        screen_files[screen_id] = {component_path: code}
        screen_metadata.append({
            'screen_id': screen_id,
            'component_path': component_path,
            'name': result['name']
        })
    
    print(f"\n   ✓ Generated {len(screen_metadata)}/{len(screens)} screens successfully")
    
    # Step 3: Generate router
    print("\n🔀 Step 3: Generating router...")
    router_code = generate_router_code(screens, transitions, entry_screen_id)
    print(f"   ✓ Router generated ({len(router_code)} chars)")
    
    # Step 4: Assemble unified project
    print("\n📦 Step 4: Assembling unified project...")
    
    # Collect all dependencies
    all_dependencies = {
        'lucide-react': '^0.263.1'
    }
    
    project = assemble_unified_project(
        shared_files=shared_files,
        screen_files=screen_files,
        router_code=router_code,
        dependencies=all_dependencies
    )
    
    print(f"   ✓ Project assembled:")
    print(f"      Total files: {len(project['files'])}")
    print(f"      - Shared components: {len(shared_files)}")
    print(f"      - Screen files: {len(screen_files)}")
    print(f"      - Router: 1")
    print(f"      Dependencies: {len(project['dependencies'])}")
    print(f"      Entry: {project['entry']}")
    
    print("\n✅ UNIFIED FLOW GENERATION COMPLETE")
    print("="*80 + "\n")
    
    return {
        'project': project,
        'screens': screen_metadata
    }