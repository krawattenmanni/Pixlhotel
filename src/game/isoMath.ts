import { FURNI_CATALOGUE } from './data';
import type { Direction, PlacedFurni, RoomDef } from './types';

export const TILE_W = 64;
export const TILE_H = 32;

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Converts grid coordinates (gx, gy) into isometric screen coordinates relative to room origin.
 */
export function gridToScreen(gx: number, gy: number, originX: number, originY: number): Point2D {
  return {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2),
  };
}

/**
 * Converts screen coordinates into fractional grid coordinates, then floors to tile indices.
 */
export function screenToGrid(sx: number, sy: number, originX: number, originY: number): Point2D {
  const dx = sx - originX;
  const dy = sy - originY;
  const gx = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
  const gy = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
  return {
    x: Math.floor(gx),
    y: Math.floor(gy),
  };
}

/**
 * Computes direction (0=SE, 1=SW, 2=NW, 3=NE) from delta movement.
 */
export function deltaToDirection(dx: number, dy: number, fallback: Direction = 0): Direction {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return fallback;
  if (dx > 0 && dy >= 0) return 0; // +x -> screen down-right (SE)
  if (dy > 0 && dx <= 0) return 1; // +y -> screen down-left (SW)
  if (dx < 0 && dy <= 0) return 2; // -x -> screen up-left (NW)
  if (dy < 0 && dx >= 0) return 3; // -y -> screen up-right (NE)
  return fallback;
}

export function isTileWalkable(
  room: RoomDef,
  placedFurni: PlacedFurni[],
  x: number,
  y: number,
  allowSeatTarget = false
): boolean {
  if (y < 0 || y >= room.layout.length) return false;
  const row = room.layout[y];
  if (!row || x < 0 || x >= row.length) return false;
  if (row[x] === 'x') return false;

  const itemsOnTile = placedFurni.filter((f) => f.x === x && f.y === y);
  for (const item of itemsOnTile) {
    const def = FURNI_CATALOGUE.find((d) => d.id === item.furniId);
    if (!def) continue;
    if (def.walkable) continue;
    if (allowSeatTarget && def.sittable) continue;
    return false;
  }
  return true;
}

export function getSeatAtTile(placedFurni: PlacedFurni[], x: number, y: number): PlacedFurni | null {
  for (const item of placedFurni) {
    if (item.x === x && item.y === y) {
      const def = FURNI_CATALOGUE.find((d) => d.id === item.furniId);
      if (def?.sittable) return item;
    }
  }
  return null;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parentKey: string | null;
}

/**
 * A* pathfinding across room tiles (4-directional + diagonal when both adjacent cardinals are open).
 */
export function findPath(
  room: RoomDef,
  placedFurni: PlacedFurni[],
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): Point2D[] {
  const sx = Math.round(startX);
  const sy = Math.round(startY);
  const gx = Math.round(goalX);
  const gy = Math.round(goalY);

  if (sx === gx && sy === gy) return [];
  if (!isTileWalkable(room, placedFurni, gx, gy, true)) return [];

  const key = (x: number, y: number) => `${x},${y}`;
  const heuristic = (x: number, y: number) => Math.abs(x - gx) + Math.abs(y - gy);

  const open = new Map<string, AStarNode>();
  const closed = new Map<string, AStarNode>();

  const startKey = key(sx, sy);
  open.set(startKey, { x: sx, y: sy, g: 0, f: heuristic(sx, sy), parentKey: null });

  const dirs: [number, number, number][] = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.41],
    [1, -1, 1.41],
    [-1, 1, 1.41],
    [-1, -1, 1.41],
  ];

  while (open.size > 0) {
    let bestKey = '';
    let bestNode: AStarNode | null = null;
    for (const [k, node] of open.entries()) {
      if (!bestNode || node.f < bestNode.f) {
        bestNode = node;
        bestKey = k;
      }
    }
    if (!bestNode) break;

    open.delete(bestKey);
    closed.set(bestKey, bestNode);

    if (bestNode.x === gx && bestNode.y === gy) {
      const path: Point2D[] = [];
      let curr: AStarNode | undefined = bestNode;
      while (curr && curr.parentKey !== null) {
        path.push({ x: curr.x, y: curr.y });
        curr = closed.get(curr.parentKey);
      }
      return path.reverse();
    }

    for (const [dx, dy, cost] of dirs) {
      const nx = bestNode.x + dx;
      const ny = bestNode.y + dy;
      const nKey = key(nx, ny);
      if (closed.has(nKey)) continue;

      const isGoal = nx === gx && ny === gy;
      if (!isTileWalkable(room, placedFurni, nx, ny, isGoal)) continue;

      // Prevent diagonal corner cutting through solid objects
      if (dx !== 0 && dy !== 0) {
        if (
          !isTileWalkable(room, placedFurni, bestNode.x + dx, bestNode.y, false) ||
          !isTileWalkable(room, placedFurni, bestNode.x, bestNode.y + dy, false)
        ) {
          continue;
        }
      }

      const tentativeG = bestNode.g + cost;
      const existing = open.get(nKey);
      if (!existing || tentativeG < existing.g) {
        open.set(nKey, {
          x: nx,
          y: ny,
          g: tentativeG,
          f: tentativeG + heuristic(nx, ny),
          parentKey: bestKey,
        });
      }
    }
  }

  return [];
}
