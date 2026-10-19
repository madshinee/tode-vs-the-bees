// Scoring rules (see Core_loop/Score/spec.md). Tweak these to balance the game.
export const SCORE_PER_SECOND = 0.1; // 1 point for every 10 seconds survived
export const SCORE_PER_KILL = 10; // points for each enemy defeated

// Bonus for every village still standing when a wave is won.
export const VILLAGE_BONUS = 25;

// Chaining kills raises a multiplier on kill points (x1 up to this value).
// Set it to 1 to follow the spec to the letter with no combo bonus.
export const MAX_COMBO_MULTIPLIER = 5;

// The displayed score is always rounded down.
export function totalScore(survivalSeconds, killPoints) {
  return Math.floor(survivalSeconds * SCORE_PER_SECOND + killPoints);
}
