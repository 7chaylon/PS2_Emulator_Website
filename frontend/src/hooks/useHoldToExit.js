import { useEffect, useRef, useState } from "react";

export function useHoldToExit({
  enabled = true,
  keyCode = "F8",
  holdMs = 5000,
  onExit,
}) {
  const timerRef = useRef(null);
  const frameRef = useRef(null);
  const startedAtRef = useRef(null);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    function clearHold() {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(frameRef.current);

      timerRef.current = null;
      frameRef.current = null;
      startedAtRef.current = null;

      setProgress(0);
    }

    function updateProgress() {
      if (!startedAtRef.current) return;

      const elapsed = Date.now() - startedAtRef.current;
      const nextProgress = Math.min((elapsed / holdMs) * 100, 100);

      setProgress(nextProgress);

      if (nextProgress >= 100) {
        clearHold();
        onExit?.();
        return;
      }

      frameRef.current = requestAnimationFrame(updateProgress);
    }

    function handleKeyDown(event) {
      if (event.code !== keyCode) return;

      event.preventDefault();

      if (timerRef.current) return;

      startedAtRef.current = Date.now();

      timerRef.current = setTimeout(() => {
        clearHold();
        onExit?.();
      }, holdMs);

      frameRef.current = requestAnimationFrame(updateProgress);
    }

    function handleKeyUp(event) {
      if (event.code !== keyCode) return;

      event.preventDefault();
      clearHold();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      clearHold();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enabled, keyCode, holdMs, onExit]);

  return progress;
}