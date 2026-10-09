import { afterEach, describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { BACKGROUND, game } from "./game";
import type { CaromState } from "./game";
import * as C from "./constants";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
async function setup(step = 8) {
  const events = new EventTarget();
  const canvas = createCanvas(C.FIELD_W, C.FIELD_H);
  const engine = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    game,
    background: BACKGROUND,
    layout: C.LAYOUT,
    clock: new ConstantClock(step),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => events,
    },
  });
  await engine.initialize();
  cleanups.push(() => engine.destroy());
  const key = (code: string, down = true) =>
    events.dispatchEvent(
      Object.assign(new Event(down ? "keydown" : "keyup"), {
        code,
        repeat: false,
      }),
    );
  const press = async (code: string) => {
    key(code);
    await engine.advance(1);
    key(code, false);
  };
  const pointer = (
    type: string,
    x: number,
    y: number,
    id = 1,
    device = "mouse",
  ) =>
    events.dispatchEvent(
      Object.assign(new Event(`pointer${type}`), {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: device,
        isPrimary: id === 1,
        button: 0,
        buttons: type === "up" ? 0 : 1,
      }),
    );
  const pose = (change: (s: CaromState) => CaromState) => engine.apply(change);
  const d = engine.debug;
  const ball = (x: number, y: number, vx: number, vy: number, spin = 0) => {
    pose((s) => d.clearWorld(s));
    pose((s) => d.spawnBall(s));
    pose((s) => d.setBallPosition(s, x, y));
    pose((s) => d.setBallVelocity(s, vx, vy));
    pose((s) => d.setBallSpin(s, spin));
    pose((s) => d.setBallHeld(s, false));
    pose((s) => d.setScreen(s, "playing"));
    pose((s) => d.setMode(s, "versus"));
  };
  return { engine, d, pose, press, key, pointer, ball, canvas };
}
describe("engine and state contract", () => {
  it("initializes the full state and pure, detached diagnostics", async () => {
    const { engine, d } = await setup();
    expect(d.snapshot(engine.state)).toMatchObject({
      version: C.CAROM_DEBUG_VERSION,
      screen: "title",
      score: { p1: 0, p2: 0 },
      receiver: "left",
      simTime: 0,
      ball: {
        held: true,
        holdTimer: C.HOLD_TIME,
        x: C.FIELD_CX,
        y: C.FIELD_CY,
      },
    });
    const before = JSON.stringify(engine.state);
    expect(engine.diagnostics().length).toBeGreaterThanOrEqual(14);
    expect(JSON.stringify(engine.state)).toBe(before);
    const snap = d.snapshot(engine.state);
    expect(snap.paddles).not.toBe(engine.state.paddles);
    await engine.advance(1);
    expect(engine.state.simTime).toBe(0.008);
    expect(engine.state.ball?.trail).toHaveLength(0);
  });
  it("poses independently, rejects absent entities, and resets everything", async () => {
    const { engine, d, pose } = await setup();
    const original = engine.state;
    pose((s) => d.setPaddleDriven(s, "left", true));
    pose((s) => d.setPaddleVy(s, "left", 333));
    pose((s) => d.setPaddleCy(s, "left", 123));
    pose((s) => d.setAiTracking(s, false));
    pose((s) => d.setAiMovement(s, false));
    pose((s) => d.setMuted(s, true));
    pose((s) => d.setScore(s, 12, 13));
    pose((s) => d.setWinner(s, "right"));
    pose((s) => d.setReceiver(s, "right"));
    pose((s) => d.setTitleIndex(s, 2));
    pose((s) => d.setResumeScreen(s, "countdown"));
    pose((s) => d.setMenuIndex(s, 1));
    expect(engine.state.paddles.left).toEqual({
      cy: 123,
      vy: 0,
      driven: true,
      drivenVy: 333,
    });
    expect(original.paddles.left.cy).toBe(C.FIELD_CY);
    pose((s) => d.clearWorld(s));
    expect(() => d.setBallSpin(engine.state, 3)).toThrow();
    expect(() => d.drawBallServeSign(engine.state)).toThrow();
    expect(() => d.spawnObstacle(engine.state, 5)).toThrow();
    pose((s) => d.spawnObstacle(s, 1));
    pose((s) => d.spawnObstacle(s, 0));
    pose((s) => d.spawnObstacle(s, 1));
    expect(engine.state.obstacles.map((o) => o.index)).toEqual([0, 1]);
    pose((s) => d.spawnBall(s));
    pose((s) => d.setBallVelocity(s, 3, 4));
    pose((s) => d.setBallPosition(s, 52, 360));
    pose((s) => d.drawBallServeSign(s));
    const before = engine.state;
    pose((s) => d.reconcile(s));
    expect(engine.state).toEqual(before);
    expect(d.snapshot(engine.state).ball?.speed).toBe(5);
    pose((s) => d.reset(s));
    expect(engine.state).toMatchObject({
      screen: "title",
      simTime: 0,
      muted: true,
      ai: { tracking: true, movement: true },
      paddles: { left: { driven: false, drivenVy: 0 } },
      titleIndex: 0,
    });
  });
});
describe("menus and controls", () => {
  it("wraps, gives movement priority, and remembers the confirmed title item", async () => {
    const { engine, key, press } = await setup();
    key("KeyW");
    key("KeyS");
    key("Enter");
    await engine.advance(1);
    ["KeyW", "KeyS", "Enter"].forEach((k) => key(k, false));
    expect(engine.state.menuIndex).toBe(2);
    expect(engine.state.screen).toBe("title");
    await press("Enter");
    expect(engine.state.screen).toBe("howto");
    await press("Escape");
    expect(engine.state.menuIndex).toBe(2);
    expect(engine.state.titleIndex).toBe(2);
    await press("ArrowDown");
    expect(engine.state.menuIndex).toBe(0);
    await press("ArrowDown");
    await press("Space");
    expect(engine.state.mode).toBe("versus");
    expect(engine.state.screen).toBe("countdown");
  });
  it("pairs pointer and touch edges, including between frames", async () => {
    const { engine, d, pointer, pose } = await setup();
    const a = d.menuItemRect(engine.state, 0)!,
      b = d.menuItemRect(engine.state, 1)!;
    pointer("down", a.x + 15, a.y + 20);
    await engine.advance(1);
    pointer("up", b.x + 15, b.y + 20);
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    pointer("down", b.x + 15, b.y + 20, 2, "touch");
    await engine.advance(1);
    pointer("up", b.x + 15, b.y + 20, 2, "touch");
    await engine.advance(1);
    expect(engine.state.mode).toBe("versus");
    expect(d.menuItemRect(engine.state, 0)).toBeNull();
    pose((s) => d.reset(s));
    pointer("down", a.x + 15, a.y + 20);
    pointer("up", a.x + 15, a.y + 20);
    await engine.advance(1);
    expect(engine.state.screen).toBe("countdown");
    expect(d.menuItemRect(engine.state, 55)).toBeNull();
  });
  it("freezes a countdown on Escape and resumes it exactly once", async () => {
    const { engine, press, key } = await setup();
    await press("Enter");
    await press("Escape");
    expect(engine.state.screen).toBe("paused");
    const ball = engine.state.ball;
    const paddles = engine.state.paddles;
    key("KeyS");
    await engine.advance(12);
    key("KeyS", false);
    expect(engine.state.ball).toEqual(ball);
    expect(engine.state.paddles).toEqual(paddles);
    await press("Escape");
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.ball!.holdTimer).toBeLessThan(ball!.holdTimer);
    await press("KeyP");
    await press("ArrowDown");
    await press("Enter");
    expect(engine.state.score).toEqual({ p1: 0, p2: 0 });
    await press("KeyP");
    await press("ArrowUp");
    await press("Enter");
    expect(engine.state.screen).toBe("title");
  });
  it("moves Solo with either key pair, separates Versus, and clamps actual velocity", async () => {
    const { engine, d, key, pose, press } = await setup();
    await press("Enter");
    key("ArrowDown");
    await engine.advance(2);
    expect(engine.state.paddles.left.cy).toBeCloseTo(
      C.FIELD_CY + 2 * C.PADDLE_SPEED * 0.008,
    );
    key("ArrowDown", false);
    pose((s) => d.setMode(s, "versus"));
    key("ArrowUp");
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(-C.PADDLE_SPEED);
    key("ArrowUp", false);
    pose((s) => d.setPaddleDriven(s, "left", true));
    pose((s) => d.setPaddleVy(s, "left", 1000));
    pose((s) => d.setPaddleCy(s, "left", C.PADDLE_MAX_CY - 1));
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(125);
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(0);
    expect(engine.state.paddles.left.drivenVy).toBe(1000);
  });
});
describe("physics and match rules", () => {
  it("serves on the elapsed frame without advancing and retains its sign", async () => {
    const { engine, d, pose } = await setup(10);
    pose((s) => d.setScreen(s, "countdown"));
    pose((s) => d.setBallHoldTimer(s, 0.005));
    pose((s) => d.setBallServeSign(s, -1));
    pose((s) => d.setReceiver(s, "right"));
    await engine.advance(1);
    expect(engine.state.screen).toBe("playing");
    expect(engine.state.ball).toMatchObject({
      x: C.FIELD_CX,
      y: C.FIELD_CY,
      held: false,
      holdTimer: 0,
      serveSign: -1,
    });
    expect(engine.state.ball!.vx).toBeCloseTo(
      C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
    );
    expect(engine.state.ball!.vy).toBeLessThan(0);
    await engine.advance(20);
    expect(engine.state.ball!.trail.length).toBeLessThanOrEqual(14);
  });
  it("adds paddle motion to spin and increases speed", async () => {
    const { engine, d, pose, ball } = await setup();
    ball(C.P1_X1 + C.BALL_R + 2, C.FIELD_CY, -C.SERVE_SPEED, 0);
    pose((s) => d.setPaddleDriven(s, "left", true));
    pose((s) => d.setPaddleVy(s, "left", C.PADDLE_SPEED));
    const cues: string[] = [];
    engine.events.on("cue:played", (e) => cues.push(e.cue));
    await engine.advance(1);
    expect(engine.state.ball!.vx).toBeGreaterThan(0);
    expect(
      Math.hypot(engine.state.ball!.vx, engine.state.ball!.vy),
    ).toBeCloseTo(C.SERVE_SPEED * C.SPEED_MULT);
    expect(engine.state.ball!.spin).toBeGreaterThan(600);
    expect(cues).toEqual([C.CUES.paddleHit]);
  });
  it.each(["top", "bottom"])(
    "reflects the %s wall without changing speed or spin beyond decay",
    async (wall) => {
      const { engine, ball } = await setup();
      ball(
        300,
        wall === "top" ? C.BALL_R + 1 : C.FIELD_H - C.BALL_R - 1,
        0,
        wall === "top" ? -800 : 800,
        200,
      );
      await engine.advance(1);
      expect(
        Math.hypot(engine.state.ball!.vx, engine.state.ball!.vy),
      ).toBeCloseTo(800);
      expect(engine.state.ball!.spin).toBeCloseTo(
        200 * Math.pow(0.5, 0.008 / C.SPIN_HALFLIFE),
      );
      expect(Math.sign(engine.state.ball!.vy)).toBe(wall === "top" ? 1 : -1);
    },
  );
  it("resolves obstacle and paddle end caps with distinct cues", async () => {
    const { engine, d, pose, ball } = await setup();
    const cues: string[] = [];
    engine.events.on("cue:played", (e) => cues.push(e.cue));
    ball(C.OBSTACLES[0]!.x0 - C.BALL_R - 1, 220, 800, 0);
    pose((s) => d.spawnObstacle(s, 0));
    await engine.advance(1);
    expect(engine.state.ball!.vx).toBe(-800);
    expect(cues).toContain(C.CUES.obstacleBounce);
    ball(
      (C.P1_X0 + C.P1_X1) / 2,
      C.FIELD_CY - C.PADDLE_HALF - C.BALL_R - 1,
      0,
      800,
    );
    await engine.advance(1);
    expect(engine.state.ball!.vy).toBe(-800);
    expect(cues).toContain(C.CUES.wallBounce);
  });
  it("scores, serves toward the receiver, and requires a two point lead", async () => {
    const { engine, d, pose, ball, press } = await setup();
    ball(C.FIELD_W + C.BALL_R + 1, 100, 500, 0);
    pose((s) => d.setScore(s, 10, 10));
    await engine.advance(1);
    expect(engine.state.score).toEqual({ p1: 11, p2: 10 });
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.receiver).toBe("right");
    expect(engine.state.ball!.trail).toEqual([]);
    ball(C.FIELD_W + C.BALL_R + 1, 100, 500, 0);
    await engine.advance(1);
    expect(engine.state.screen).toBe("matchover");
    expect(engine.state.winner).toBe("left");
    await press("Enter");
    expect(engine.state.score).toEqual({ p1: 0, p2: 0 });
    ball(-C.BALL_R - 1, 100, -500, 0);
    pose((s) => d.setScore(s, 9, 10));
    await engine.advance(1);
    expect(engine.state.winner).toBe("right");
    await press("Escape");
    expect(engine.state.screen).toBe("title");
  });
  it("keeps absent and held balls inert, and respects independent AI gates", async () => {
    const { engine, d, pose, ball } = await setup();
    ball(900, 100, 500, 50);
    pose((s) => d.setMode(s, "solo"));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(-C.AI_SPEED);
    pose((s) => d.setAiMovement(s, false));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(0);
    pose((s) => d.setAiMovement(s, true));
    pose((s) => d.setAiTracking(s, false));
    pose((s) => d.setPaddleCy(s, "right", 100));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(C.AI_SPEED);
    pose((s) => d.setBallHeld(s, true));
    const x = engine.state.ball!.x;
    await engine.advance(1);
    expect(engine.state.ball!.x).toBe(x);
    pose((s) => d.clearWorld(s));
    await engine.advance(1);
    expect(engine.state.ball).toBeNull();
    expect(engine.state.score).toEqual({ p1: 0, p2: 0 });
  });
  it("matches spin flight and wall events at 2ms and 16ms", async () => {
    const run = async (step: number) => {
      const { engine, ball } = await setup(step);
      ball(400, 40, 580, -280, 460);
      const cues: string[] = [];
      engine.events.on("cue:played", (e) => cues.push(e.cue));
      await engine.advance(800 / step);
      return { b: engine.state.ball!, cues };
    };
    const a = await run(2),
      b = await run(16);
    expect(a.cues).toEqual(b.cues);
    expect(Math.hypot(a.b.vx, a.b.vy)).toBeCloseTo(Math.hypot(b.b.vx, b.b.vy));
    expect(Math.abs(a.b.vx - b.b.vx)).toBeLessThan(10);
    expect(Math.sign(a.b.vy)).toBe(Math.sign(b.b.vy));
  });
  it("mirrors mute and silences the runtime cues without stopping play", async () => {
    const { engine, d, pose, ball, press } = await setup();
    await press("KeyM");
    expect(engine.state.muted).toBe(true);
    ball(-30, 100, -500, 0);
    const gains: number[] = [];
    engine.events.on("cue:played", (e) => gains.push(e.gain));
    await engine.advance(1);
    expect(gains).toEqual([0]);
    pose((s) => d.setMuted(s, false));
    await engine.advance(1);
    expect(engine.state.muted).toBe(false);
  });
});
