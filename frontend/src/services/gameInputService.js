import { api } from "../lib/api";

export const PS2_INPUT_STATE = {
  DOWN: "down",
  UP: "up",
};

export const PS2_BUTTONS = {
  DPAD_UP: "dpadUp",
  DPAD_DOWN: "dpadDown",
  DPAD_LEFT: "dpadLeft",
  DPAD_RIGHT: "dpadRight",

  TRIANGLE: "triangle",
  CIRCLE: "circle",
  CROSS: "cross",
  SQUARE: "square",

  L1: "l1",
  L2: "l2",
  L3: "l3",

  R1: "r1",
  R2: "r2",
  R3: "r3",

  START: "start",
  SELECT: "select",
  ANALOG: "analog",

  LEFT_ANALOG_UP: "leftAnalogUp",
  LEFT_ANALOG_DOWN: "leftAnalogDown",
  LEFT_ANALOG_LEFT: "leftAnalogLeft",
  LEFT_ANALOG_RIGHT: "leftAnalogRight",

  RIGHT_ANALOG_UP: "rightAnalogUp",
  RIGHT_ANALOG_DOWN: "rightAnalogDown",
  RIGHT_ANALOG_LEFT: "rightAnalogLeft",
  RIGHT_ANALOG_RIGHT: "rightAnalogRight",
};

export async function sendGameInputHttp({
  gameSessionId,
  ps2Button,
  inputCode,
  state,
}) {
  if (!gameSessionId) return;

  return api("/api/game/input", {
    method: "POST",
    body: JSON.stringify({
      gameSessionId,
      ps2Button,
      inputCode,
      state,
      timestamp: Date.now(),
    }),
  });
}

export function createInputPayload({
  gameSessionId,
  ps2Button,
  inputCode,
  state,
}) {
  return {
    type: "game-input",
    gameSessionId,
    ps2Button,
    inputCode,
    state,
    timestamp: Date.now(),
  };
}