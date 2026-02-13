"""
Agentic Orchestrator for Progressive UI Generation

Agent uses tools to:
- Think about task and plan approach
- View existing project files
- Write/update files progressively
- Build complete multi-screen app iteratively
"""
from typing import Dict, Any, List, Optional, Callable, Awaitable
import json
import asyncio
import os
from anthropic import AsyncAnthropic

from app.generation.project_template import get_initial_template
from app.generation.multifile_parser import add_shadcn_components_to_files


class AgenticOrchestrator:
    """
    Orchestrates agentic UI generation with tool use
    """
    
    def __init__(
        self,
        task_description: str,
        taste_context: Optional[Dict[str, Any]] = None,
        device_info: Optional[Dict[str, Any]] = None,
        on_file_update: Optional[Callable[[str, str], Awaitable[None]]] = None,
        on_thinking: Optional[Callable[[str], Awaitable[None]]] = None,
        on_architecture: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
    ):
        """
        Initialize agentic orchestrator
        
        Args:
            task_description: User's task/request
            taste_context: Designer taste model context
            device_info: Target device specifications
            on_file_update: Callback for file updates (path, content)
            on_thinking: Callback for agent thinking steps
            on_architecture: Callback for flow architecture definition
        """
        self.task_description = task_description
        self.taste_context = taste_context or {}
        self.device_info = device_info or {}
        self.on_file_update = on_file_update
        self.on_thinking = on_thinking
        self.on_architecture = on_architecture
        
        # Project state
        self.files: Dict[str, str] = {}
        self.architecture: Optional[Dict[str, Any]] = None
        
        # LLM client
        self.llm = None
        
    async def generate(self) -> Dict[str, Any]:
        """
        Generate complete project using agentic loop
        
        Returns:
            Complete project with files and metadata
        """
        # Initialize project template
        self.files = get_initial_template(self.device_info)
        
        # Stream initial files
        if self.on_file_update:
            for path, content in self.files.items():
                await self.on_file_update(path, content)
        
        # Initialize Anthropic client
        api_key = os.getenv("ANTHROPIC_API_KEY")
        self.llm = AsyncAnthropic(api_key=api_key)
        
        # Build system prompt
        system_prompt = self._build_system_prompt()
        
        # Start agentic loop
        conversation_history = []
        
        # Initial user message
        user_message = self._build_initial_message()
        conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        # Agent loop
        max_iterations = 50  # Safety limit
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            
            # Call LLM with tools
            response = await self._call_llm_with_tools(
                system_prompt,
                conversation_history
            )
            
            # Add assistant response to history
            conversation_history.append({
                "role": "assistant",
                "content": response.content
            })
            
            # Check if agent is done
            if self._is_complete(response):
                break
            
            # Process tool uses
            tool_results = await self._process_tool_uses(response)
            
            # Add tool results to conversation
            if tool_results:
                conversation_history.append({
                    "role": "user",
                    "content": tool_results
                })
            else:
                # No tools used, agent might be stuck - break
                break
        
        # Return final project
        return {
            "files": self.files,
            "architecture": self.architecture,
            "dependencies": self._get_dependencies()
        }
    
    def _build_system_prompt(self) -> str:
        """Build system prompt with base design system and taste"""
        from app.generation.prompt_assembler import PromptAssembler
        
        # Read core prompt templates
        assembler = PromptAssembler()
        
        # Load base design system and agentic instructions
        base_design = assembler._load_template("core/base_design_system.md")
        agentic_system = assembler._load_template("core/agentic_system.md")
        design_quality = assembler._load_template("core/design_quality.md")
        
        # Build system prompt
        sections = [
            "# Role",
            "You are an expert React developer building a multi-screen UI application.",
            "",
            "# Base Design System",
            base_design,
            "",
            "# Design Quality Standards",
            design_quality,
            "",
            "# Agentic Instructions",
            agentic_system,
        ]
        
        # Add taste context if available
        if self.taste_context:
            taste_section = self._format_taste_context()
            sections.extend([
                "",
                "# Designer Taste Model",
                "The following designer taste should guide your design decisions:",
                taste_section
            ])
        
        return "\n".join(sections)
    
    def _build_initial_message(self) -> str:
        """Build initial user message with task and current state"""
        
        device_desc = ""
        if self.device_info:
            width = self.device_info.get('screen', {}).get('width', 'unknown')
            height = self.device_info.get('screen', {}).get('height', 'unknown')
            platform = self.device_info.get('platform', 'web')
            device_desc = f"\n\nTarget device: {platform} ({width}x{height}px)"
        
        return f"""# Task
{self.task_description}{device_desc}

# Current Project State
The project has been initialized with a basic template:
{self._format_file_tree()}

# Your Mission
1. First, analyze the task and plan the flow architecture (screens, transitions)
2. Then progressively build the application by:
   - Creating shared components in /components/
   - Creating screen components in /screens/
   - Updating App.tsx router as needed
3. Use tools to view existing files and write new ones
4. Build iteratively - you can revisit and improve files
5. Ensure all screens follow the base design system and taste model

Start by defining the flow architecture, then build the app file by file."""
    
    async def _call_llm_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]]
    ) -> Any:
        """Call LLM with tool definitions"""
        
        tools = self._get_tool_definitions()
        
        response = await self.llm.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=tools
        )
        
        return response
    
    def _get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Define available tools for agent"""
        return [
            {
                "name": "define_architecture",
                "description": "Define the flow architecture with screens and transitions. Use this FIRST before building any screens.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "screens": {
                            "type": "array",
                            "description": "List of screens in the flow",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "screen_id": {"type": "string", "description": "Unique screen ID (e.g., 's1', 's2')"},
                                    "name": {"type": "string", "description": "Screen name (e.g., 'Login', 'Dashboard')"},
                                    "description": {"type": "string", "description": "What this screen does"}
                                },
                                "required": ["screen_id", "name", "description"]
                            }
                        },
                        "transitions": {
                            "type": "array",
                            "description": "Transitions between screens",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "transition_id": {"type": "string", "description": "Unique transition ID (e.g., 't1')"},
                                    "from_screen_id": {"type": "string"},
                                    "to_screen_id": {"type": "string"},
                                    "trigger": {"type": "string", "description": "What triggers this transition"}
                                },
                                "required": ["transition_id", "from_screen_id", "to_screen_id", "trigger"]
                            }
                        },
                        "entry_screen_id": {
                            "type": "string",
                            "description": "ID of the entry/first screen"
                        }
                    },
                    "required": ["screens", "transitions", "entry_screen_id"]
                }
            },
            {
                "name": "view_file",
                "description": "View the contents of an existing file in the project",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "File path to view (e.g., '/App.tsx', '/components/ui/button.tsx')"
                        }
                    },
                    "required": ["path"]
                }
            },
            {
                "name": "write_file",
                "description": "Create or update a file in the project. Use this to progressively build the application.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "File path (e.g., '/screens/LoginScreen.tsx', '/components/Header.tsx')"
                        },
                        "content": {
                            "type": "string",
                            "description": "Complete file content"
                        },
                        "reasoning": {
                            "type": "string",
                            "description": "Brief explanation of what this file does and why you're creating/updating it"
                        }
                    },
                    "required": ["path", "content", "reasoning"]
                }
            },
            {
                "name": "list_files",
                "description": "List all files currently in the project",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        ]
    
    async def _process_tool_uses(self, response: Any) -> Optional[List[Dict[str, Any]]]:
        """Process tool uses from LLM response"""
        
        tool_results = []
        
        for block in response.content:
            if block.type == "text":
                # Stream thinking to frontend
                if self.on_thinking:
                    await self.on_thinking(block.text)
            
            elif block.type == "tool_use":
                tool_name = block.name
                tool_input = block.input
                tool_id = block.id
                
                # Execute tool
                result = await self._execute_tool(tool_name, tool_input)
                
                # Add result
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_id,
                    "content": result
                })
        
        return tool_results if tool_results else None
    
    async def _execute_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> str:
        """Execute a tool and return result"""
        
        if tool_name == "define_architecture":
            return await self._tool_define_architecture(tool_input)
        
        elif tool_name == "view_file":
            return self._tool_view_file(tool_input)
        
        elif tool_name == "write_file":
            return await self._tool_write_file(tool_input)
        
        elif tool_name == "list_files":
            return self._tool_list_files()
        
        else:
            return f"Error: Unknown tool '{tool_name}'"
    
    async def _tool_define_architecture(self, params: Dict[str, Any]) -> str:
        """Define flow architecture"""
        self.architecture = {
            "screens": params["screens"],
            "transitions": params["transitions"],
            "entry_screen_id": params["entry_screen_id"]
        }
        
        # Notify frontend
        if self.on_architecture:
            await self.on_architecture(self.architecture)
        
        # Update App.tsx router
        router_code = self._generate_router_code()
        self.files["/App.tsx"] = router_code
        
        if self.on_file_update:
            await self.on_file_update("/App.tsx", router_code)
        
        screen_names = [s["name"] for s in params["screens"]]
        return f"Architecture defined successfully. Flow has {len(params['screens'])} screens: {', '.join(screen_names)}. Router updated in App.tsx."
    
    def _tool_view_file(self, params: Dict[str, Any]) -> str:
        """View file contents"""
        path = params["path"]
        
        if path not in self.files:
            return f"Error: File '{path}' does not exist. Available files: {', '.join(self.files.keys())}"
        
        return f"Contents of {path}:\n\n{self.files[path]}"
    
    async def _tool_write_file(self, params: Dict[str, Any]) -> str:
        """Write/update file"""
        path = params["path"]
        content = params["content"]
        reasoning = params.get("reasoning", "")
        
        # Update project state
        self.files[path] = content
        
        # Stream to frontend
        if self.on_file_update:
            await self.on_file_update(path, content)
        
        action = "Updated" if path in self.files else "Created"
        return f"{action} {path} successfully. {reasoning}"
    
    def _tool_list_files(self) -> str:
        """List all files"""
        if not self.files:
            return "No files in project yet."
        
        return "Project files:\n" + "\n".join(f"  {path}" for path in sorted(self.files.keys()))
    
    def _generate_router_code(self) -> str:
        """Generate App.tsx router based on architecture"""
        if not self.architecture:
            return self.files.get("/App.tsx", "")
        
        screens = self.architecture["screens"]
        transitions = self.architecture["transitions"]
        entry_id = self.architecture["entry_screen_id"]
        
        # Build imports
        imports = ["import { useState } from 'react'"]
        for screen in screens:
            component_name = screen['name'].replace(' ', '').replace('-', '') + 'Screen'
            imports.append(f"import {component_name} from './screens/{component_name}'")
        
        # Build transition map
        trans_map_entries = [
            f"    '{t['transition_id']}': '{t['to_screen_id']}'"
            for t in transitions
        ]
        trans_map = "{\n" + ",\n".join(trans_map_entries) + "\n  }"
        
        # Build switch cases
        cases = []
        for screen in screens:
            component_name = screen['name'].replace(' ', '').replace('-', '') + 'Screen'
            cases.append(
                f"    case '{screen['screen_id']}':\n"
                f"      return <{component_name} onTransition={{handleTransition}} />"
            )
        
        # Default case
        entry_screen = next(s for s in screens if s['screen_id'] == entry_id)
        entry_component = entry_screen['name'].replace(' ', '').replace('-', '') + 'Screen'
        cases.append(
            f"    default:\n"
            f"      return <{entry_component} onTransition={{handleTransition}} />"
        )
        
        return f"""{chr(10).join(imports)}

export default function App() {{
  const [currentScreen, setCurrentScreen] = useState('{entry_id}')

  const transitionMap = {trans_map}

  const handleTransition = (transitionId: string) => {{
    const nextScreen = transitionMap[transitionId]
    if (nextScreen) {{
      setCurrentScreen(nextScreen)
    }}
  }}

  switch (currentScreen) {{
{chr(10).join(cases)}
  }}
}}"""
    
    def _is_complete(self, response: Any) -> bool:
        """Check if agent indicates completion"""
        # Agent is done when it has no tool uses
        has_tool_use = any(block.type == "tool_use" for block in response.content)
        
        # Also check for completion indicators in text
        text_content = " ".join(
            block.text.lower() for block in response.content 
            if block.type == "text"
        )
        
        completion_phrases = [
            "application is complete",
            "all screens are ready",
            "project is finished",
            "implementation is complete"
        ]
        
        has_completion_phrase = any(phrase in text_content for phrase in completion_phrases)
        
        return not has_tool_use and has_completion_phrase
    
    def _format_file_tree(self) -> str:
        """Format current files as tree"""
        if not self.files:
            return "  (empty)"
        
        return "\n".join(f"  {path}" for path in sorted(self.files.keys()))
    
    def _format_taste_context(self) -> str:
        """Format taste context for prompt"""
        if not self.taste_context:
            return ""
        
        sections = []
        
        if "exact_tokens" in self.taste_context:
            sections.append("## Exact Design Tokens\n" + self.taste_context["exact_tokens"])
        
        if "patterns" in self.taste_context:
            sections.append("## Design Patterns\n" + self.taste_context["patterns"])
        
        if "personality" in self.taste_context:
            sections.append("## Design Personality\n" + self.taste_context["personality"])
        
        if "examples" in self.taste_context:
            sections.append("## Reference Examples\n" + self.taste_context["examples"])
        
        return "\n\n".join(sections)
    
    def _get_dependencies(self) -> Dict[str, str]:
        """Extract dependencies from package.json"""
        package_json = self.files.get('/package.json')
        if not package_json:
            return {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
            }
        
        try:
            import json
            parsed = json.loads(package.json)
            return parsed.get('dependencies', {})
        except:
            return {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
            }