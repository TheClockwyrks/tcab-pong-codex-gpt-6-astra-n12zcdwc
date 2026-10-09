import type { DeepReadonly } from "ts-essentials";
import type {
  BallState,
  CaromDebugApi,
  CaromState,
  PaddleState,
  Side,
} from "./game";
import * as C from "./constants";
import { drawSign, initialState, parkBall } from "./world";
import { menuItemRect } from "./menus";

type State = DeepReadonly<CaromState>;
function ball(s: State, patch: Partial<BallState>): CaromState {
  if (!s.ball) throw new Error("Carom: no ball is present");
  return { ...s, ball: { ...s.ball, ...patch } };
}
function paddle(s: State, side: Side, patch: Partial<PaddleState>): CaromState {
  return {
    ...s,
    paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...patch } },
  };
}
export function createDebug(): CaromDebugApi {
  return {
    version: C.CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...s, ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...s, ball: parkBall() }),
    spawnObstacle: (s, index) => {
      const p = C.OBSTACLE_CENTERS[index];
      if (!p || !Number.isInteger(index))
        throw new Error(`Carom: invalid obstacle ${index}`);
      return {
        ...s,
        obstacles: [
          ...s.obstacles.filter((o) => o.index !== index),
          { index, cx: p.x, cy: p.y },
        ].sort((a, b) => a.index - b.index),
      };
    },
    reset: (s) => initialState(s.muted),
    reconcile: (s) => ({ ...s }),
    setScreen: (s, screen) => ({ ...s, screen }),
    setMode: (s, mode) => ({ ...s, mode }),
    setMenuIndex: (s, menuIndex) => ({ ...s, menuIndex }),
    setTitleIndex: (s, titleIndex) => ({ ...s, titleIndex }),
    setResumeScreen: (s, resumeScreen) => ({ ...s, resumeScreen }),
    setScore: (s, p1, p2) => ({ ...s, score: { p1, p2 } }),
    setWinner: (s, winner) => ({ ...s, winner }),
    setReceiver: (s, receiver) => ({ ...s, receiver }),
    setPaddleCy: (s, side, cy) => paddle(s, side, { cy }),
    setPaddleVy: (s, side, drivenVy) => paddle(s, side, { drivenVy }),
    setPaddleDriven: (s, side, driven) => paddle(s, side, { driven }),
    setBallPosition: (s, x, y) => ball(s, { x, y }),
    setBallVelocity: (s, vx, vy) => ball(s, { vx, vy }),
    setBallSpin: (s, spin) => ball(s, { spin }),
    setBallHeld: (s, held) => ball(s, { held }),
    setBallHoldTimer: (s, holdTimer) => ball(s, { holdTimer }),
    setBallServeSign: (s, serveSign) => ball(s, { serveSign }),
    drawBallServeSign: (s) => {
      if (!s.ball) throw new Error("Carom: no ball is present");
      return ball(s, { serveSign: drawSign() });
    },
    setAiTracking: (s, tracking) => ({ ...s, ai: { ...s.ai, tracking } }),
    setAiMovement: (s, movement) => ({ ...s, ai: { ...s.ai, movement } }),
    setMuted: (s, muted) => ({ ...s, muted }),
    snapshot: (s) => ({
      version: C.CAROM_DEBUG_VERSION,
      screen: s.screen,
      mode: s.mode,
      menuIndex: s.menuIndex,
      titleIndex: s.titleIndex,
      resumeScreen: s.resumeScreen,
      score: { ...s.score },
      winner: s.winner,
      muted: s.muted,
      paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
      ai: { ...s.ai },
      receiver: s.receiver,
      ball: s.ball
        ? {
            ...s.ball,
            speed: Math.hypot(s.ball.vx, s.ball.vy),
            trail: s.ball.trail.map((p) => ({ ...p })),
          }
        : null,
      obstacles: s.obstacles.map((o) => ({ ...o })),
      simTime: s.simTime,
    }),
    menuItemRect,
  };
}
