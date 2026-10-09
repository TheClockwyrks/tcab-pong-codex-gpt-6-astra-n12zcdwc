import type { DeepReadonly } from "ts-essentials";
import type { UpdateApi, PointerSample } from "@clockwyrks/simple-2d";
import type { CaromState, MenuRect, Mode } from "./game";
import * as C from "./constants";
import { initialState, parkBall } from "./world";

export function menuItems(s: DeepReadonly<CaromState>): readonly string[] {
  switch (s.screen) {
    case "title":
      return C.TITLE_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    case "paused":
      return C.PAUSE_ITEMS;
    case "matchover":
      return C.MATCHOVER_ITEMS;
    default:
      return [];
  }
}
export function menuItemRect(
  s: DeepReadonly<CaromState>,
  index: number,
): MenuRect | null {
  if (!Number.isInteger(index) || index < 0 || index >= menuItems(s).length)
    return null;
  if (s.screen === "title")
    return { x: 104, y: 351 + index * 70, w: 400, h: 58 };
  if (s.screen === "howto") return { x: 440, y: 602, w: 400, h: 58 };
  return { x: 440, y: 365 + index * 70, w: 400, h: 58 };
}
export function returnTitle(s: DeepReadonly<CaromState>): CaromState {
  return {
    ...initialState(s.muted),
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
    simTime: s.simTime,
  };
}
export function startMatch(
  s: DeepReadonly<CaromState>,
  mode: Mode,
): CaromState {
  return {
    ...s,
    mode,
    screen: "countdown",
    resumeScreen: "playing",
    menuIndex: 0,
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    ball: parkBall(),
    paddles: {
      left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
      right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
    },
  };
}
function confirm(s: DeepReadonly<CaromState>): CaromState {
  switch (s.screen) {
    case "title": {
      const next = { ...s, titleIndex: s.menuIndex };
      return s.menuIndex === 2
        ? { ...next, screen: "howto", menuIndex: 0 }
        : startMatch(next, s.menuIndex === 0 ? "solo" : "versus");
    }
    case "howto":
      return returnTitle(s);
    case "paused":
      return s.menuIndex === 0
        ? { ...s, screen: s.resumeScreen }
        : s.menuIndex === 1
          ? startMatch(s, s.mode)
          : returnTitle(s);
    case "matchover":
      return s.menuIndex === 0 ? startMatch(s, s.mode) : returnTitle(s);
    default:
      return { ...s };
  }
}
function hit(s: DeepReadonly<CaromState>, p: { x: number; y: number }): number {
  return menuItems(s).findIndex((_, i) => {
    const r = menuItemRect(s, i)!;
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  });
}

/** Input provenance is kept in the value, never in a listener or module closure. */
export interface MenuGesture {
  readonly id: number;
  readonly item: number;
  readonly screen: CaromState["screen"];
}
export function readMenus(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
): CaromState {
  const edges = Object.fromEntries(
    C.ACTIONS.map((a) => [a, api.input.pressed(a)]),
  ) as Record<C.ActionName, boolean>;
  const samples: PointerSample[] = api.input.pointerSamples();
  const contacts = api.input.pointerContacts();
  let s: CaromState = { ...state };
  if (edges.mute) s = { ...s, muted: !s.muted };
  if (s.screen === "playing" || s.screen === "countdown") {
    return edges.pause
      ? {
          ...s,
          resumeScreen: s.screen,
          screen: "paused",
          menuIndex: 0,
          menuGestures: [],
        }
      : s;
  }
  if (s.screen === "paused" && (edges.pause || edges.back))
    return { ...s, screen: s.resumeScreen, menuGestures: [] };
  if ((s.screen === "howto" || s.screen === "matchover") && edges.back)
    return returnTitle(s);
  const count = menuItems(s).length;
  const up = edges["p1-up"] || edges["p2-up"];
  const down = edges["p1-down"] || edges["p2-down"];
  const keyboardConfirm = !up && !down && edges.confirm;
  if (up) s = { ...s, menuIndex: (s.menuIndex + count - 1) % count };
  else if (down) s = { ...s, menuIndex: (s.menuIndex + 1) % count };
  // Confirm from the keyboard owns this frame, even if a pointer also releases.
  if (keyboardConfirm) return { ...confirm(s), menuGestures: [] };
  let gestures = [...(s.menuGestures ?? [])];
  let pointerConfirm = false;
  for (const p of samples) {
    const item = hit(s, p);
    if (item >= 0) s = { ...s, menuIndex: item };
    if (p.type === "down" && p.button === "primary") {
      gestures = [
        ...gestures.filter((g) => g.id !== p.id),
        { id: p.id, item, screen: s.screen },
      ];
    }
    if (p.type === "up") {
      const origin = gestures.find((g) => g.id === p.id);
      if (item >= 0 && origin?.item === item && origin.screen === s.screen)
        pointerConfirm = true;
      gestures = gestures.filter((g) => g.id !== p.id);
    }
  }
  for (const p of contacts) {
    if (p.device !== "touch") continue;
    const item = hit(s, p);
    if (item >= 0) s = { ...s, menuIndex: item };
  }
  return pointerConfirm
    ? { ...confirm(s), menuGestures: [] }
    : { ...s, menuGestures: gestures };
}
