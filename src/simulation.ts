import type { DeepReadonly } from "ts-essentials";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState, BallState, PaddleState, Side } from "./game";
import * as C from "./constants";
import { readMenus } from "./menus";
import { parkBall } from "./world";

export const clamp = (x: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, x));
function movePaddle(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const desired = p.cy + vy * dt;
  const cy = clamp(desired, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy, vy: desired !== cy && dt > 0 ? (cy - p.cy) / dt : vy };
}
function paddleVelocity(
  s: DeepReadonly<CaromState>,
  side: Side,
  api: UpdateApi,
  dt: number,
): number {
  const paddle = s.paddles[side];
  if (paddle.driven) return paddle.drivenVy;
  if (side === "right" && s.mode === "solo") {
    if (!s.ai.movement) return 0;
    const defend =
      s.ai.tracking &&
      s.screen === "playing" &&
      s.ball !== null &&
      s.ball.vx > 0;
    const target =
      defend && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
    const diff = target - paddle.cy;
    return Math.abs(diff) <= (defend ? C.AI_DEADZONE : C.AI_HOME_DEADZONE)
      ? 0
      : Math.sign(diff) *
          Math.min(C.AI_SPEED, dt > 0 ? Math.abs(diff) / dt : C.AI_SPEED);
  }
  const up =
    side === "left"
      ? api.input.value("p1-up") ||
        (s.mode === "solo" && api.input.value("p2-up"))
      : api.input.value("p2-up");
  const down =
    side === "left"
      ? api.input.value("p1-down") ||
        (s.mode === "solo" && api.input.value("p2-down"))
      : api.input.value("p2-down");
  return (Number(Boolean(down)) - Number(Boolean(up))) * C.PADDLE_SPEED;
}
type MovingBall = { -readonly [K in keyof BallState]: BallState[K] };
type Face = "left" | "right" | "top" | "bottom";
/** Expanded AABB contact, with the specified stable tie order. */
function contact(b: MovingBall, r: C.Rect): Face | null {
  const depths = [
    b.x - (r.x0 - C.BALL_R),
    r.x1 + C.BALL_R - b.x,
    b.y - (r.y0 - C.BALL_R),
    r.y1 + C.BALL_R - b.y,
  ];
  if (depths.some((d) => d <= 0)) return null;
  const face = (["left", "right", "top", "bottom"] as const)[
    depths.indexOf(Math.min(...depths))
  ]!;
  if (face === "left") b.x = r.x0 - C.BALL_R;
  else if (face === "right") b.x = r.x1 + C.BALL_R;
  else if (face === "top") b.y = r.y0 - C.BALL_R;
  else b.y = r.y1 + C.BALL_R;
  return face;
}
function reflect(b: MovingBall, face: Face): boolean {
  if ((face === "left" && b.vx > 0) || (face === "right" && b.vx < 0)) {
    b.vx = -b.vx;
    return true;
  }
  if ((face === "top" && b.vy > 0) || (face === "bottom" && b.vy < 0)) {
    b.vy = -b.vy;
    return true;
  }
  return false;
}
export function flyBall(
  state: DeepReadonly<CaromState>,
  dt: number,
  cues: Set<C.CueName>,
): BallState | null {
  if (!state.ball || state.ball.held) return state.ball;
  const b: MovingBall = { ...state.ball };
  const n = Math.max(
    1,
    Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
  );
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const a = (b.spin / speed) * h;
      const vx = b.vx * Math.cos(a) - b.vy * Math.sin(a);
      b.vy = b.vx * Math.sin(a) + b.vy * Math.cos(a);
      b.vx = vx;
    }
    b.spin *= Math.pow(0.5, h / C.SPIN_HALFLIFE);
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b.y = C.BALL_R;
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b.y = C.FIELD_H - C.BALL_R;
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    }
    for (const side of ["left", "right"] as const) {
      const p = state.paddles[side];
      const face = contact(b, {
        x0: side === "left" ? C.P1_X0 : C.P2_X0,
        x1: side === "left" ? C.P1_X1 : C.P2_X1,
        y0: p.cy - C.PADDLE_HALF,
        y1: p.cy + C.PADDLE_HALF,
      });
      if (!face) continue;
      if (face === "top" || face === "bottom") {
        if (reflect(b, face)) cues.add(C.CUES.wallBounce);
      } else {
        const theta =
          clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
        const outgoing = Math.min(
          Math.hypot(b.vx, b.vy) * C.SPEED_MULT,
          C.SPEED_CAP,
        );
        b.vx = (side === "left" ? 1 : -1) * outgoing * Math.cos(theta);
        b.vy = outgoing * Math.sin(theta);
        b.spin = clamp(
          b.spin + p.vy * C.SPIN_FROM_PADDLE,
          -C.SPIN_CLAMP,
          C.SPIN_CLAMP,
        );
        b.x = side === "left" ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R;
        cues.add(C.CUES.paddleHit);
      }
    }
    for (const obstacle of state.obstacles) {
      const face = contact(b, C.OBSTACLES[obstacle.index]!);
      if (face && reflect(b, face)) cues.add(C.CUES.obstacleBounce);
    }
  }
  return b;
}
export function updateGame(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  let s = readMenus(state, api);
  api.audio.setMuted(s.muted);
  s = { ...s, simTime: state.simTime + dt, muted: api.audio.muted() };
  if (s.screen !== "playing" && s.screen !== "countdown") return s;
  s = {
    ...s,
    paddles: {
      left: movePaddle(s.paddles.left, paddleVelocity(s, "left", api, dt), dt),
      right: movePaddle(
        s.paddles.right,
        paddleVelocity(s, "right", api, dt),
        dt,
      ),
    },
  };
  const cues = new Set<C.CueName>();
  let ball = s.ball;
  if (ball && s.screen === "countdown") {
    const holdTimer = Math.max(0, ball.holdTimer - dt);
    ball = { ...ball, holdTimer };
    if (holdTimer <= 0) {
      ball = {
        ...ball,
        held: false,
        vx:
          (s.receiver === "left" ? -1 : 1) *
          C.SERVE_SPEED *
          Math.cos(C.SERVE_ANGLE),
        vy: ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
        trail: [],
      };
      s = { ...s, screen: "playing" };
    }
  } else if (ball) ball = flyBall(s, dt, cues);
  if (ball)
    ball = {
      ...ball,
      trail: [
        ...ball.trail.filter((p) => s.simTime - p.t <= C.TRAIL_TIME),
        { x: ball.x, y: ball.y, t: s.simTime },
      ],
    };
  s = { ...s, ball };
  if (
    ball &&
    !ball.held &&
    s.screen === "playing" &&
    (ball.x - C.BALL_R > C.FIELD_W || ball.x + C.BALL_R < 0)
  ) {
    const left = ball.x > C.FIELD_CX;
    const score = {
      p1: s.score.p1 + Number(left),
      p2: s.score.p2 + Number(!left),
    };
    const wins = left
      ? score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD
      : score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD;
    s = { ...s, score };
    cues.add(C.CUES.score);
    s = wins
      ? {
          ...s,
          winner: left ? "left" : "right",
          screen: "matchover",
          menuIndex: 0,
        }
      : {
          ...s,
          ball: parkBall(),
          receiver: left ? "right" : "left",
          screen: "countdown",
        };
  }
  for (const cue of cues) api.audio.play(cue);
  return s;
}
