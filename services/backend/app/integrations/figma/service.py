"""
Figma API Integration Service
"""
import os
import httpx
import json
from typing import Dict, Any, Optional, Tuple

# Get Figma access token from environment
FIGMA_ACCESS_TOKEN = os.getenv("FIGMA_ACCESS_TOKEN")


async def fetch_figma_node(file_key: str, node_id: str) -> Dict[str, Any]:
    """
    Fetch a specific node's JSON data from Figma API
    
    Args:
        file_key: The Figma file key (from the URL)
        node_id: The node ID within the file
        
    Returns:
        The node's JSON data
        
    Raises:
        HTTPException if the request fails
    """
    if not FIGMA_ACCESS_TOKEN:
        raise Exception("FIGMA_ACCESS_TOKEN not configured")
    
    # Figma API endpoint for getting a specific node
    url = f"https://api.figma.com/v1/files/{file_key}/nodes"
    
    headers = {
        "X-Figma-Token": FIGMA_ACCESS_TOKEN
    }
    
    params = {
        "ids": node_id,
        "depth": 99,  # Get full depth
        "geometry": "paths"  # Include geometry data
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params, timeout=30.0)
        
        if response.status_code != 200:
            raise Exception(f"Figma API error: {response.status_code} - {response.text}")
        
        data = response.json()
        
        # Extract the specific node
        if "nodes" not in data or node_id not in data["nodes"]:
            raise Exception(f"Node {node_id} not found in file {file_key}")
        
        return data["nodes"][node_id]


async def render_figma_node(file_key: str, node_id: str) -> bytes:
    """
    Render a Figma node as a PNG image
    
    Args:
        file_key: The Figma file key
        node_id: The node ID to render
        
    Returns:
        PNG image bytes
        
    Raises:
        HTTPException if the request fails
    """
    if not FIGMA_ACCESS_TOKEN:
        raise Exception("FIGMA_ACCESS_TOKEN not configured")
    
    # Step 1: Get the image URL from Figma
    url = f"https://api.figma.com/v1/images/{file_key}"
    
    headers = {
        "X-Figma-Token": FIGMA_ACCESS_TOKEN
    }
    
    params = {
        "ids": node_id,
        "format": "png",
        "scale": 2  # 2x resolution
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params, timeout=30.0)
        
        if response.status_code != 200:
            raise Exception(f"Figma render API error: {response.status_code} - {response.text}")
        
        data = response.json()
        
        if "images" not in data or node_id not in data["images"]:
            raise Exception(f"Failed to get image URL for node {node_id}")
        
        image_url = data["images"][node_id]
        
        if not image_url:
            raise Exception(f"Image URL is null for node {node_id}")
        
        # Step 2: Download the actual image
        image_response = await client.get(image_url, timeout=60.0)
        
        if image_response.status_code != 200:
            raise Exception(f"Failed to download image: {image_response.status_code}")
        
        return image_response.content


async def fetch_and_render_figma_node(
    file_key: str, 
    node_id: str
) -> Tuple[Dict[str, Any], bytes]:
    """
    Fetch both the JSON data and rendered image for a Figma node
    
    Args:
        file_key: The Figma file key
        node_id: The node ID
        
    Returns:
        Tuple of (node_json_data, image_bytes)
    """
    # Fetch both in parallel for efficiency
    import asyncio
    
    json_task = fetch_figma_node(file_key, node_id)
    image_task = render_figma_node(file_key, node_id)
    
    json_data, image_bytes = await asyncio.gather(json_task, image_task)
    
    return json_data, image_bytes