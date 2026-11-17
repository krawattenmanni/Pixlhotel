import type { BanzaiTeam, BanzaiTileState, PlayerState } from './types';

export const BANZAI_ARENA_BOUNDS = {
  minX: 2,
  maxX: 7,
  minY: 2,
  maxY: 7,
};

export const BANZAI_REWARD_CREDITS = 150;
export const BANZAI_REWARD_DUCKETS = 100;

export function banzaiTileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function isBanzaiTile(x: number, y: number): boolean {
  return (
    x >= BANZAI_ARENA_BOUNDS.minX &&
    x <= BANZAI_ARENA_BOUNDS.maxX &&
    y >= BANZAI_ARENA_BOUNDS.minY &&
    y <= BANZAI_ARENA_BOUNDS.maxY
  );
}

export function createInitialBanzaiTiles(): Record<string, BanzaiTileState> {
  const tiles: Record<string, BanzaiTileState> = {};
  for (let y = BANZAI_ARENA_BOUNDS.minY; y <= BANZAI_ARENA_BOUNDS.maxY; y++) {
    for (let x = BANZAI_ARENA_BOUNDS.minX; x <= BANZAI_ARENA_BOUNDS.maxX; x++) {
      tiles[banzaiTileKey(x, y)] = { level: 0, team: null };
    }
  }
  return tiles;
}

/**
 * Steps a team onto a Banzai tile:
 * - Level 0 -> Level 1 (glowing)
 * - Level 1 (same team) -> Level 2 (bright)
 * - Level 2 (same team) -> Level 3 (locked permanently for that team)
 * - Stepping onto another team's unlocked (1 or 2) tile captures it at Level 1.
 * - Locked (level 3) tiles never change.
 */
export function stepBanzaiTile(
  tiles: Record<string, BanzaiTileState>,
  x: number,
  y: number,
  team: BanzaiTeam
): { tiles: Record<string, BanzaiTileState>; changed: boolean; justLocked: boolean } {
  if (!isBanzaiTile(x, y)) return { tiles, changed: false, justLocked: false };
  const key = banzaiTileKey(x, y);
  const current = tiles[key] ?? { level: 0, team: null };

  if (current.level === 3) {
    return { tiles, changed: false, justLocked: false };
  }

  let next: BanzaiTileState;
  if (current.team === team) {
    const nextLevel = Math.min(3, current.level + 1) as 0 | 1 | 2 | 3;
    next = { level: nextLevel, team };
  } else {
    next = { level: 1, team };
  }

  return {
    tiles: { ...tiles, [key]: next },
    changed: true,
    justLocked: next.level === 3,
  };
}

export function computeBanzaiScores(
  tiles: Record<string, BanzaiTileState>
): Record<BanzaiTeam, number> {
  const scores: Record<BanzaiTeam, number> = { blue: 0, red: 0, yellow: 0 };
  for (const state of Object.values(tiles)) {
    if (state.level === 3 && state.team) {
      scores[state.team] += 1;
    }
  }
  return scores;
}

export interface BanzaiMatchResolution {
  scores: Record<BanzaiTeam, number>;
  winner: BanzaiTeam | 'tie';
  playerWon: boolean;
  creditsAwarded: number;
  ducketsAwarded: number;
  player: PlayerState;
  summary: string;
}

export function resolveBanzaiMatch(
  tiles: Record<string, BanzaiTileState>,
  player: PlayerState
): BanzaiMatchResolution {
  const scores = computeBanzaiScores(tiles);
  const maxScore = Math.max(scores.blue, scores.red, scores.yellow);
  const leaders = (['blue', 'red', 'yellow'] as BanzaiTeam[]).filter((t) => scores[t] === maxScore);

  // Player wins if Blue has the highest locked tile count (or ties for 1st with > 0 tiles)
  const playerWon = maxScore > 0 && scores.blue === maxScore;
  const winner: BanzaiTeam | 'tie' = leaders.length === 1 ? leaders[0] : playerWon ? 'blue' : 'tie';

  const creditsAwarded = playerWon ? BANZAI_REWARD_CREDITS : 0;
  const ducketsAwarded = playerWon ? BANZAI_REWARD_DUCKETS : 0;

  const updatedPlayer: PlayerState = playerWon
    ? {
        ...player,
        credits: player.credits + creditsAwarded,
        duckets: player.duckets + ducketsAwarded,
      }
    : player;

  const summary = playerWon
    ? `Blue Team Victory (${scores.blue} locked tiles)! Earned +${creditsAwarded} Credits & +${ducketsAwarded} Duckets!`
    : winner === 'red'
    ? `Red Team wins with ${scores.red} locked tiles! Blue Team locked ${scores.blue}.`
    : winner === 'yellow'
    ? `Yellow Team wins with ${scores.yellow} locked tiles! Blue Team locked ${scores.blue}.`
    : `Match Draw! Try locking more tiles next round.`;

  return {
    scores,
    winner,
    playerWon,
    creditsAwarded,
    ducketsAwarded,
    player: updatedPlayer,
    summary,
  };
}
