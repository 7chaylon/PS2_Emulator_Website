import { useEffect, useMemo, useRef } from "react";

const AXIS_THRESHOLD = 0.65;

function invertBindings(bindings = {}) {
  const result = {};

  for (const [ps2Button, inputCode] of Object.entries(bindings)) {
    if (!inputCode) continue;

    result[inputCode] = ps2Button;
  }

  return result;
}

export function useGameInputCapture({
  enabled,
  bindings,
  onInputDown,
  onInputUp,
}) {
  const inputToPs2Button = useMemo(() => {
    return invertBindings(bindings);
  }, [bindings]);

  const pressedInputsRef = useRef(new Set());
  const previousGamepadButtonsRef = useRef({});
  const previousGamepadAxesRef = useRef({});
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    function sendDown(inputCode) {
      const ps2Button = inputToPs2Button[inputCode];

      if (!ps2Button) return;
      if (pressedInputsRef.current.has(inputCode)) return;

      pressedInputsRef.current.add(inputCode);

      onInputDown?.({
        inputCode,
        ps2Button,
      });
    }

    function sendUp(inputCode) {
      const ps2Button = inputToPs2Button[inputCode];

      if (!ps2Button) return;
      if (!pressedInputsRef.current.has(inputCode)) return;

      pressedInputsRef.current.delete(inputCode);

      onInputUp?.({
        inputCode,
        ps2Button,
      });
    }

    function handleKeyDown(event) {
      event.preventDefault();
      sendDown(event.code);
    }

    function handleKeyUp(event) {
      event.preventDefault();
      sendUp(event.code);
    }

    function readGamepads() {
      const gamepads = navigator.getGamepads
        ? Array.from(navigator.getGamepads()).filter(Boolean)
        : [];

      for (const gamepad of gamepads) {
        gamepad.buttons.forEach((button, index) => {
          const inputCode = `GamepadButton${index}`;
          const key = `${gamepad.index}-${inputCode}`;

          const wasPressed = previousGamepadButtonsRef.current[key] || false;
          const isPressed = button.pressed;

          if (isPressed && !wasPressed) {
            sendDown(inputCode);
          }

          if (!isPressed && wasPressed) {
            sendUp(inputCode);
          }

          previousGamepadButtonsRef.current[key] = isPressed;
        });

        gamepad.axes.forEach((axisValue, index) => {
          const positiveInputCode = `GamepadAxis${index}+`;
          const negativeInputCode = `GamepadAxis${index}-`;

          const positiveKey = `${gamepad.index}-${positiveInputCode}`;
          const negativeKey = `${gamepad.index}-${negativeInputCode}`;

          const isPositive = axisValue > AXIS_THRESHOLD;
          const isNegative = axisValue < -AXIS_THRESHOLD;

          const wasPositive = previousGamepadAxesRef.current[positiveKey] || false;
          const wasNegative = previousGamepadAxesRef.current[negativeKey] || false;

          if (isPositive && !wasPositive) {
            sendDown(positiveInputCode);
          }

          if (!isPositive && wasPositive) {
            sendUp(positiveInputCode);
          }

          if (isNegative && !wasNegative) {
            sendDown(negativeInputCode);
          }

          if (!isNegative && wasNegative) {
            sendUp(negativeInputCode);
          }

          previousGamepadAxesRef.current[positiveKey] = isPositive;
          previousGamepadAxesRef.current[negativeKey] = isNegative;
        });
      }

      frameRef.current = requestAnimationFrame(readGamepads);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    frameRef.current = requestAnimationFrame(readGamepads);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      cancelAnimationFrame(frameRef.current);

      pressedInputsRef.current.clear();
      previousGamepadButtonsRef.current = {};
      previousGamepadAxesRef.current = {};
    };
  }, [enabled, inputToPs2Button, onInputDown, onInputUp]);
}