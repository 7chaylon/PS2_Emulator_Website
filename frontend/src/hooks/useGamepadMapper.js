import { useEffect, useRef } from "react";

const AXIS_THRESHOLD = 0.65;

export function useGamepadMapper({ enabled, onInput }) {
  const previousButtonsRef = useRef({});
  const previousAxesRef = useRef({});
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    function readGamepads() {
      const gamepads = navigator.getGamepads
        ? Array.from(navigator.getGamepads()).filter(Boolean)
        : [];

      for (const gamepad of gamepads) {
        gamepad.buttons.forEach((button, index) => {
          const key = `${gamepad.index}-button-${index}`;
          const wasPressed = previousButtonsRef.current[key] || false;
          const isPressed = button.pressed;

          if (isPressed && !wasPressed) {
            onInput({
              code: `GamepadButton${index}`,
              label: `Botão ${index}`,
              type: "button",
              gamepadId: gamepad.id,
            });
          }

          previousButtonsRef.current[key] = isPressed;
        });

        gamepad.axes.forEach((axisValue, index) => {
          const positiveKey = `${gamepad.index}-axis-${index}+`;
          const negativeKey = `${gamepad.index}-axis-${index}-`;

          const isPositive = axisValue > AXIS_THRESHOLD;
          const isNegative = axisValue < -AXIS_THRESHOLD;

          const wasPositive = previousAxesRef.current[positiveKey] || false;
          const wasNegative = previousAxesRef.current[negativeKey] || false;

          if (isPositive && !wasPositive) {
            onInput({
              code: `GamepadAxis${index}+`,
              label: `Eixo ${index}+`,
              type: "axis",
              gamepadId: gamepad.id,
            });
          }

          if (isNegative && !wasNegative) {
            onInput({
              code: `GamepadAxis${index}-`,
              label: `Eixo ${index}-`,
              type: "axis",
              gamepadId: gamepad.id,
            });
          }

          previousAxesRef.current[positiveKey] = isPositive;
          previousAxesRef.current[negativeKey] = isNegative;
        });
      }

      frameRef.current = requestAnimationFrame(readGamepads);
    }

    frameRef.current = requestAnimationFrame(readGamepads);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [enabled, onInput]);
}