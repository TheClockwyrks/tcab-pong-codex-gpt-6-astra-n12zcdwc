import type { DeepReadonly } from "ts-essentials";
import type { RenderApi } from "@clockwyrks/simple-2d";
import type { CaromState } from "./game";
import { BACKGROUND } from "./game";
import * as C from "./constants";
import { menuItemRect, menuItems } from "./menus";

const INK = "#eaf3ee";
const MUTED = "#829597";
const CYAN = "#7be6d8";
const CORAL = "#ff877b";
const GOLD = "#e8bd73";
const LINE = "#25373c";
type Context = CanvasRenderingContext2D;
type State = DeepReadonly<CaromState>;
function text(
  ctx: Context,
  value: string,
  x: number,
  y: number,
  size = 16,
  color = INK,
  weight = 400,
  align: CanvasTextAlign = "left",
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${weight >= 600 ? '"Arial", sans-serif' : '"Courier New", monospace'}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, x, y);
}
function line(
  ctx: Context,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color = LINE,
  width = 1,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function bar(
  ctx: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  glow = 0,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w / 2, 7));
  ctx.fill();
  ctx.restore();
}
function circle(
  ctx: Context,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function background(ctx: Context): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  const glow = ctx.createRadialGradient(890, 330, 30, 780, 360, 740);
  glow.addColorStop(0, "#12262b");
  glow.addColorStop(1, BACKGROUND);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.fillStyle = "#26383b";
  for (let x = 24; x < C.FIELD_W; x += 32)
    for (let y = 24; y < C.FIELD_H; y += 32) ctx.fillRect(x, y, 1, 1);
}
function footer(ctx: Context, s: State): void {
  line(ctx, 48, 666, 1232, 666);
  text(ctx, "A GAME OF ANGLES", 48, 695, 11, MUTED);
  text(
    ctx,
    s.muted ? "M  SOUND OFF" : "M  SOUND ON",
    1232,
    695,
    11,
    MUTED,
    400,
    "right",
  );
}
function buttons(ctx: Context, s: State): void {
  const details =
    s.screen === "title"
      ? ["YOU VS THE MACHINE", "TWO PLAYERS · ONE KEYBOARD", "LEARN THE ANGLES"]
      : [];
  menuItems(s).forEach((item, i) => {
    const r = menuItemRect(s, i)!;
    const selected = s.menuIndex === i;
    ctx.fillStyle = selected ? CYAN : "#112025";
    ctx.strokeStyle = selected ? CYAN : LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 5);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      `0${i + 1}`,
      r.x + 18,
      r.y + 34,
      12,
      selected ? "#31544f" : MUTED,
    );
    text(ctx, item, r.x + 55, r.y + 35, 18, selected ? BACKGROUND : INK, 700);
    text(
      ctx,
      "↗",
      r.x + r.w - 23,
      r.y + 36,
      23,
      selected ? BACKGROUND : MUTED,
      600,
      "center",
    );
    if (selected && details[i])
      text(ctx, details[i], r.x, r.y + r.h + 11, 8, MUTED);
  });
}
function title(ctx: Context, s: State): void {
  text(ctx, "C /", 48, 57, 24, CYAN, 700);
  text(ctx, "INDEPENDENT ARCADE  /  001", 99, 54, 11, MUTED);
  text(ctx, "PADDLE DUEL", 1232, 54, 11, MUTED, 400, "right");
  line(ctx, 48, 78, 1232, 78);
  text(ctx, "CHANGE THE ANGLE.", 104, 160, 12, CYAN);
  ctx.save();
  ctx.translate(99, 277);
  ctx.transform(1, 0, -0.09, 1, 0, 0);
  text(ctx, C.TITLE_TEXT, 0, 0, 108, INK, 900);
  ctx.restore();
  text(ctx, "A little spin. A different game.", 104, 316, 17, MUTED);
  buttons(ctx, s);
  text(ctx, "↑ ↓ / W S   SELECT     ENTER   PLAY", 104, 598, 11, MUTED);
  // A graphic court study: the bank trajectory is illustration, never simulation.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(621, 124, 563, 476, 12);
  ctx.clip();
  ctx.fillStyle = "#0e1c21";
  ctx.fillRect(621, 124, 563, 476);
  for (let x = 650; x < 1180; x += 36) line(ctx, x, 124, x, 600, "#182a30");
  for (let y = 140; y < 600; y += 36) line(ctx, 621, y, 1184, y, "#182a30");
  ctx.setLineDash([4, 10]);
  line(ctx, 904, 144, 904, 580, "#375052");
  ctx.setLineDash([]);
  ctx.strokeStyle = "#23463f";
  ctx.lineWidth = 44;
  ctx.beginPath();
  ctx.moveTo(674, 458);
  ctx.bezierCurveTo(757, 473, 788, 314, 858, 311);
  ctx.bezierCurveTo(947, 307, 955, 207, 1078, 225);
  ctx.stroke();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.stroke();
  ctx.setLineDash([]);
  bar(ctx, 664, 415, 10, 78, CYAN, 16);
  bar(ctx, 1131, 199, 10, 78, CORAL, 16);
  bar(ctx, 823, 227, 14, 98, GOLD, 12);
  bar(ctx, 986, 412, 14, 98, GOLD, 12);
  circle(ctx, 1078, 225, 9, INK);
  ctx.strokeStyle = "#526f69";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(1078, 225, 18, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, "01 / SPIN", 680, 526, 11, CYAN);
  text(ctx, "02 / BANK", 944, 551, 11, GOLD);
  text(ctx, "03 / SCORE", 1013, 174, 11, CORAL);
  ctx.restore();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(621, 124, 563, 476, 12);
  ctx.stroke();
  text(
    ctx,
    "MOVE INTO THE HIT. BEND THE RALLY.",
    902,
    625,
    11,
    MUTED,
    400,
    "center",
  );
  footer(ctx, s);
}
function field(ctx: Context, s: State): void {
  // Court markings are low contrast so the collision bodies stay unmistakable.
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 12, C.FIELD_W - 48, C.FIELD_H - 24);
  ctx.save();
  ctx.setLineDash([5, 12]);
  line(ctx, C.NET_X, 112, C.NET_X, C.FIELD_H - 55, "#304247");
  ctx.restore();
  ctx.strokeStyle = "#23393d";
  ctx.beginPath();
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 65, 0, Math.PI * 2);
  ctx.stroke();
  for (const o of s.obstacles) {
    bar(
      ctx,
      o.cx - C.OBSTACLE_HW - 5,
      o.cy - C.OBSTACLE_HH - 5,
      C.OBSTACLE_W + 10,
      C.OBSTACLE_H + 10,
      "#352f26",
    );
    bar(
      ctx,
      o.cx - C.OBSTACLE_HW,
      o.cy - C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      GOLD,
      12,
    );
    text(
      ctx,
      o.index === 0 ? "A" : "B",
      o.cx,
      o.cy + C.OBSTACLE_HH + 24,
      10,
      GOLD,
      400,
      "center",
    );
  }
  bar(
    ctx,
    C.P1_X0,
    s.paddles.left.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    CYAN,
    20,
  );
  bar(
    ctx,
    C.P2_X0,
    s.paddles.right.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    CORAL,
    20,
  );
  if (s.ball) {
    const b = s.ball;
    const samples = b.trail;
    const flightTime = samples[samples.length - 1]?.t ?? 0;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1]!,
        p = samples[i]!;
      const alpha = Math.max(0, 1 - (flightTime - p.t) / C.TRAIL_TIME);
      ctx.save();
      ctx.globalAlpha = alpha * 0.48;
      ctx.lineCap = "round";
      line(ctx, a.x, a.y, p.x, p.y, b.spin >= 0 ? CYAN : CORAL, 3 + alpha * 12);
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = INK;
    ctx.shadowBlur = 18;
    circle(ctx, b.x, b.y, C.BALL_R, INK);
    ctx.restore();
    if (Math.abs(b.spin) > 50 && !b.held) {
      ctx.strokeStyle = b.spin > 0 ? CYAN : CORAL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const angle = flightTime * 5 * Math.sign(b.spin);
      ctx.arc(b.x, b.y, C.BALL_R + 6, angle, angle + Math.PI * 1.4);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#0b1418e8";
  ctx.fillRect(440, 15, 400, 96);
  text(ctx, "PLAYER 01", 543, 39, 10, CYAN, 400, "center");
  text(
    ctx,
    s.mode === "solo" ? "MACHINE" : "PLAYER 02",
    737,
    39,
    10,
    CORAL,
    400,
    "center",
  );
  text(
    ctx,
    String(s.score.p1).padStart(2, "0"),
    543,
    96,
    54,
    INK,
    700,
    "center",
  );
  text(
    ctx,
    String(s.score.p2).padStart(2, "0"),
    737,
    96,
    54,
    INK,
    700,
    "center",
  );
  text(ctx, "/", C.FIELD_CX, 81, 23, MUTED, 400, "center");
  text(ctx, "C / CAROM", 48, 45, 15, INK, 700);
  text(
    ctx,
    s.mode === "solo" ? "SOLO / HUMAN × MACHINE" : "VERSUS / LOCAL DUEL",
    48,
    66,
    10,
    MUTED,
  );
  text(
    ctx,
    `FIRST TO ${C.WIN_SCORE} · WIN BY ${C.WIN_LEAD}`,
    1232,
    44,
    10,
    MUTED,
    400,
    "right",
  );
  text(ctx, "P / ESC  PAUSE", 1232, 65, 10, MUTED, 400, "right");
  text(
    ctx,
    s.mode === "solo" ? "W S / ↑ ↓  MOVE" : "W S  MOVE",
    94,
    693,
    11,
    CYAN,
  );
  text(
    ctx,
    s.mode === "solo" ? "AI OPPONENT" : "↑ ↓  MOVE",
    1186,
    693,
    11,
    CORAL,
    400,
    "right",
  );
  text(
    ctx,
    s.muted ? "M  SOUND OFF" : "M  SOUND ON",
    C.FIELD_CX,
    693,
    10,
    MUTED,
    400,
    "center",
  );
  if (s.screen === "countdown" && s.ball) {
    text(ctx, "GET READY", C.FIELD_CX, 285, 15, CYAN, 600, "center");
    text(
      ctx,
      s.receiver === "left" ? "← YOUR SERVE" : "SERVE →",
      C.FIELD_CX,
      451,
      11,
      MUTED,
      400,
      "center",
    );
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      C.FIELD_CX,
      C.FIELD_CY,
      39,
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2 * s.ball.holdTimer) / C.HOLD_TIME,
    );
    ctx.stroke();
  }
}
function howto(ctx: Context, s: State): void {
  text(ctx, "C / CAROM", 48, 55, 22, CYAN, 700);
  text(ctx, "FIELD NOTES / HOW TO PLAY", 1232, 52, 12, MUTED, 400, "right");
  line(ctx, 48, 78, 1232, 78);
  text(ctx, "Make every angle yours.", C.FIELD_CX, 163, 45, INK, 700, "center");
  text(
    ctx,
    `FIRST TO ${C.WIN_SCORE}. LEAD BY ${C.WIN_LEAD}. KEEP THE BALL IN PLAY.`,
    C.FIELD_CX,
    202,
    12,
    MUTED,
    400,
    "center",
  );
  const xs = [88, 478, 868];
  const headings = ["MOVE", "PUT A SPIN ON IT", "PLAY THE BANK"];
  const descriptions = [
    [
      "Solo: W / S or ↑ / ↓",
      "Versus: P1 W / S · P2 ↑ / ↓",
      "Move up and down to defend.",
      "Send the ball past your rival.",
    ],
    [
      "Move your paddle as you hit.",
      "Down adds clockwise spin;",
      "up bends the other way.",
      "The curve fades as it travels.",
    ],
    [
      "Amber bars are solid obstacles.",
      "Bank a shot around a defender.",
      "Top and bottom walls rebound.",
      "Every paddle hit adds speed.",
    ],
  ];
  xs.forEach((x, i) => {
    ctx.fillStyle = "#112126";
    ctx.beginPath();
    ctx.roundRect(x, 245, 324, 288, 8);
    ctx.fill();
    text(ctx, `0${i + 1}`, x + 24, 278, 11, CYAN);
    if (i === 0) {
      bar(ctx, x + 34, 303, 10, 65, CYAN);
      line(ctx, x + 72, 315, x + 72, 359, CYAN, 2);
      text(ctx, "↕", x + 95, 351, 38, CYAN, 600);
    }
    if (i === 1) {
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 28, 364);
      ctx.bezierCurveTo(x + 85, 366, x + 68, 300, x + 145, 311);
      ctx.stroke();
      circle(ctx, x + 145, 311, 8, INK);
    }
    if (i === 2) {
      bar(ctx, x + 90, 301, 10, 65, GOLD);
      line(ctx, x + 25, 361, x + 77, 315, GOLD, 2);
      line(ctx, x + 77, 315, x + 35, 292, GOLD, 2);
      circle(ctx, x + 35, 292, 6, INK);
    }
    text(ctx, headings[i]!, x + 24, 401, 19, INK, 700);
    descriptions[i]!.forEach((v, j) =>
      text(ctx, v, x + 24, 435 + j * 22, 12, MUTED),
    );
  });
  text(
    ctx,
    "P / ESC  PAUSE & RESUME       M  MUTE       TOUCH  ON-SCREEN CONTROLS",
    C.FIELD_CX,
    571,
    11,
    MUTED,
    400,
    "center",
  );
  buttons(ctx, s);
}
export function renderGame(s: State, api: RenderApi): void {
  const ctx = api.ctx;
  ctx.save();
  background(ctx);
  if (s.screen === "title") title(ctx, s);
  else if (s.screen === "howto") howto(ctx, s);
  else {
    field(ctx, s);
    if (s.screen === "paused" || s.screen === "matchover") {
      ctx.fillStyle = "#071013d9";
      ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      ctx.fillStyle = "#101f24";
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(376, 151, 528, 469, 12);
      ctx.fill();
      ctx.stroke();
      text(
        ctx,
        s.screen === "paused" ? "TAKE A BREATHER" : "MATCH COMPLETE",
        C.FIELD_CX,
        201,
        11,
        CYAN,
        400,
        "center",
      );
      const heading =
        s.screen === "paused"
          ? "Paused."
          : s.winner === "left"
            ? "Player 01 wins."
            : s.mode === "solo"
              ? "Machine wins."
              : "Player 02 wins.";
      text(
        ctx,
        heading,
        C.FIELD_CX,
        270,
        s.screen === "paused" ? 60 : 42,
        INK,
        700,
        "center",
      );
      text(
        ctx,
        `${String(s.score.p1).padStart(2, "0")}  /  ${String(s.score.p2).padStart(2, "0")}`,
        C.FIELD_CX,
        319,
        24,
        MUTED,
        400,
        "center",
      );
      buttons(ctx, s);
      text(
        ctx,
        "↑ ↓  SELECT    ENTER  CONFIRM",
        C.FIELD_CX,
        593,
        10,
        MUTED,
        400,
        "center",
      );
    }
  }
  ctx.restore();
}
