import { findFurniDef } from './data';
import type { Direction, PlacedFurni, RoomDef } from './types';

export const TILE_W = 64;
export const TILE_H = 32;
export const TILE_Z_PX = 16;

export interface Point2D {
  x: number;
  y: number;
}

export function getTileChar(room: RoomDef, gx: number, gy: number): string {
  const rx = Math.round(gx);
  const ry = Math.round(gy);
  if (ry < 0 || ry >= room.layout.length) return 'x';
  const row = room.layout[ry];
  if (!row || rx < 0 || rx >= row.length) return 'x';
  return row[rx];
}

export function getTileHeight(room: RoomDef, gx: number, gy: number): number {
  const ch = getTileChar(room, gx, gy);
  switch (ch) {
    case 'w':
      // Sunken pool / pond water: 14px below main deck ('1' at z=1 -> 1 - 14/16 = 0.125)
      return 0.125;
    case 'l':
      // Pool ladder transition step between sunken water and main deck
      return 0.55;
    case '0':
      // Standard flat floor
      return 0;
    case '1':
    case 'b':
    case 'c':
      // Main deck / terrace floor / cobblestone path
      return 1;
    case 's':
      // Staircase transition between deck ('1') and upper terrace ('2')
      return 1.5;
    case '2':
      // Raised upper terrace / DJ stage (+16px above main deck)
      return 2;
    case '3':
    case 'd':
      // High cliff / diving board tower (+32px above main deck)
      return 3;
    default:
      return 0;
  }
}

export function isSwimTile(room: RoomDef, gx: number, gy: number): boolean {
  return getTileChar(room, gx, gy) === 'w';
}

export function isChangingBoothTile(room: RoomDef, gx: number, gy: number): boolean {
  return getTileChar(room, gx, gy) === 'b';
}

export function isDivingBoardTile(room: RoomDef, gx: number, gy: number): boolean {
  return getTileChar(room, gx, gy) === 'd';
}

/**
 * Converts grid coordinates (gx, gy, gz) into isometric screen coordinates relative to room origin.
 */
export function gridToScreen(
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  gz = 0
): Point2D {
  return {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2) - gz * TILE_Z_PX,
  };
}

/**
 * Converts screen coordinates into fractional grid coordinates, then floors to tile indices.
 * When a room is provided, checks elevated/sunken tile diamonds in front-to-back order for accurate picking.
 */
export function screenToGrid(
  sx: number,
  sy: number,
  originX: number,
  originY: number,
  room?: RoomDef
): Point2D {
  if (room) {
    // Check tiles in reverse painter order (front-most first) against exact elevated/sunken diamonds
    const candidates: { x: number; y: number; depth: number }[] = [];
    for (let y = 0; y < room.layout.length; y++) {
      const row = room.layout[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 'x') continue;
        const z = getTileHeight(room, x, y);
        candidates.push({ x, y, depth: x + y + z * 0.08 });
      }
    }
    candidates.sort((a, b) => b.depth - a.depth);
    for (const c of candidates) {
      const z = getTileHeight(room, c.x, c.y);
      const top = gridToScreen(c.x, c.y, originX, originY, z);
      const centerX = top.x;
      const centerY = top.y + TILE_H / 2;
      const relX = Math.abs(sx - centerX) / (TILE_W / 2);
      const relY = Math.abs(sy - centerY) / (TILE_H / 2);
      if (relX + relY <= 1.04) {
        return { x: c.x, y: c.y };
      }
    }
  }

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
  const ch = row[x];
  if (ch === 'x') return false;
  // Decorative rocky cliff tops ('3') on Rooftop Pool are non-walkable scenery
  if (ch === '3') return false;

  const itemsOnTile = placedFurni.filter((f) => f.x === x && f.y === y);
  for (const item of itemsOnTile) {
    const def = findFurniDef(item.furniId);
    if (!def) continue;
    if (def.walkable) continue;
    if (allowSeatTarget && def.sittable) continue;
    return false;
  }
  return true;
}

export function canStepBetweenTiles(
  room: RoomDef,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): boolean {
  const fromZ = getTileHeight(room, fromX, fromY);
  const toZ = getTileHeight(room, toX, toY);
  const fromChar = getTileChar(room, fromX, fromY);
  const toChar = getTileChar(room, toX, toY);

  // Diving board ('d') allows walking from '2' tower onto 'd', or diving straight into 'w' pool
  if (fromChar === '2' && toChar === 'd') return true;
  if (fromChar === 'd' && toChar === '2') return true;
  if (fromChar === 'd' && toChar === 'w') return true;
  if (fromChar === 'w' && toChar === 'd') return false; // climb out via pool ladder ('l')
  // Pool ladder ('l') smoothly connects sunken pool ('w') and main deck ('1')
  if ((fromChar === 'w' && toChar === 'l') || (fromChar === 'l' && toChar === 'w')) return true;
  if ((fromChar === '1' && toChar === 'l') || (fromChar === 'l' && toChar === '1')) return true;
  // Prevent stepping directly across sheer pool wall without ladder (except diving board)
  if ((fromChar === 'w' && toChar === '1') || (fromChar === '1' && toChar === 'w')) return false;

  return Math.abs(toZ - fromZ) <= 0.75;
}

export function getSeatAtTile(placedFurni: PlacedFurni[], x: number, y: number): PlacedFurni | null {
  for (const item of placedFurni) {
    if (item.x === x && item.y === y) {
      const def = findFurniDef(item.furniId);
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
      if (!canStepBetweenTiles(room, bestNode.x, bestNode.y, nx, ny)) continue;

      // Prevent diagonal corner cutting through solid objects or cliffs
      if (dx !== 0 && dy !== 0) {
        if (
          !isTileWalkable(room, placedFurni, bestNode.x + dx, bestNode.y, false) ||
          !isTileWalkable(room, placedFurni, bestNode.x, bestNode.y + dy, false) ||
          !canStepBetweenTiles(room, bestNode.x, bestNode.y, bestNode.x + dx, bestNode.y) ||
          !canStepBetweenTiles(room, bestNode.x, bestNode.y, bestNode.x, bestNode.y + dy)
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
