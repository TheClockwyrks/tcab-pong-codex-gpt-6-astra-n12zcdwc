import type { BallState, CaromState, PaddleState } from "./game";
import * as C from "./constants";

export const drawSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
export function parkBall(): BallState {
  return {
    x: C.FIELD_CX,
    y: C.FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: C.HOLD_TIME,
    serveSign: drawSign(),
    trail: [],
  };
}
export function initialState(muted: boolean): CaromState {
  const paddle = (): PaddleState => ({
    cy: C.FIELD_CY,
    vy: 0,
    driven: false,
    drivenVy: 0,
  });
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: { left: paddle(), right: paddle() },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: parkBall(),
    obstacles: C.OBSTACLE_CENTERS.map((p, index) => ({
      index,
      cx: p.x,
      cy: p.y,
    })),
    simTime: 0,
    muted,
  };
}
