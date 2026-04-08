from typing import Optional

def has_upstream_path(start_id: str, target_id: str, connections: list) -> bool:
    """BFS upstream from start_id — returns True if target_id is an ancestor (cycle detection)."""
    visited = set()
    queue = [start_id]
    while queue:
        node = queue.pop(0)
        if node == target_id:
            return True
        if node in visited:
            continue
        visited.add(node)
        # Walk upstream: find connections where this node is the child
        for c in connections:
            if c.child_asset_id == node and c.parent_asset_id not in visited:
                queue.append(c.parent_asset_id)
    return False

def compute_load(asset_id: str, connections: list, assets_map: dict, telemetry_map: dict, visited: set) -> float:
    """Recursively sum load of all downstream assets. 
    Uses real-time telemetry if available, else falls back to a 70% Diversity Factor of rated power.
    """
    if asset_id in visited:
        return 0.0
    visited.add(asset_id)
    
    children = [c.child_asset_id for c in connections if c.parent_asset_id == asset_id]
    
    # If it's a leaf node, get its active consumption
    if not children:
        asset = assets_map.get(asset_id)
        if not asset: return 0.0
        
        # 1. Check real-time telemetry map (passed in for efficiency)
        if asset_id in telemetry_map:
            return telemetry_map[asset_id]
        
        # 2. Fallback: 70% of Rated Power (Diversity Factor) so it's not pegged at 100%
        return (asset.rated_power or 0.0) * 0.7
    
    # If it's a parent, sum its children's recursive loads
    return sum(compute_load(cid, connections, assets_map, telemetry_map, visited) for cid in children)

def network_state(current_load: float, rated_power: Optional[float], max_load_pct: float) -> str:
    if not rated_power or rated_power == 0:
        return "NORMAL"
    load_pct = (current_load / rated_power) * 100
    if load_pct > max_load_pct:
        return "CRITICAL"
    if load_pct > 85:
        return "WARNING"
    return "NORMAL"
