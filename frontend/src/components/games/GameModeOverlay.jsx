import React, { useEffect } from "react";

import { getAssetUrl } from "../../lib/api";
import { useHoldToExit } from "../../hooks/useHoldToExit";
import { useGameInputCapture } from "../../hooks/useGameInputCapture";

export function GameModeOverlay({
  open,
  game,
  gameSession,
  loading,
  controlBindings = {},
  onExit,
}) {
  const exitProgress = useHoldToExit({
    enabled: open,
    keyCode: "F8",
    holdMs: 5000,
    onExit,
  });

  useGameInputCapture({
    enabled: open && Boolean(gameSession?.gameSessionId),
    bindings: controlBindings,
    onInputDown: ({ inputCode, ps2Button }) => {
      console.log("PS2 INPUT DOWN:", {
        inputCode,
        ps2Button,
      });
    },
    onInputUp: ({ inputCode, ps2Button }) => {
      console.log("PS2 INPUT UP:", {
        inputCode,
        ps2Button,
      });
    },
  });

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("game-mode-active");
    document.documentElement.classList.add("game-mode-active");

    return () => {
      document.body.classList.remove("game-mode-active");
      document.documentElement.classList.remove("game-mode-active");
    };
  }, [open]);

  if (!open) return null;

  const coverUrl = getAssetUrl(game?.coverUrl);

  return (
    <section className="game-mode-overlay">
      <div className="game-mode-player">
        <div className="game-mode-placeholder">
          {coverUrl && (
            <img src={coverUrl} alt={game?.title || "Jogo"} />
          )}

          <div>
            <span>Modo jogo</span>
            <h1>{game?.title || "Iniciando jogo"}</h1>

            <p>
              {loading
                ? "Iniciando sessão do emulador..."
                : gameSession?.gameSessionId
                  ? "Sessão iniciada. O streaming WebRTC será exibido aqui."
                  : "Preparando sessão..."}
            </p>

            <small>
              Segure <strong>F8</strong> por 5 segundos para encerrar.
            </small>
          </div>
        </div>

        <button
          type="button"
          className="game-mode-dev-exit"
          onClick={onExit}
          title="Encerrar sessão"
        >
          Encerrar
        </button>

        {exitProgress > 0 && (
          <div className="exit-hold-indicator">
            <span>Encerrando sessão...</span>

            <div>
              <div style={{ width: `${exitProgress}%` }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}