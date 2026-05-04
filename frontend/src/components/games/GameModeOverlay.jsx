import React, { useCallback, useEffect } from "react";

import { getAssetUrl } from "../../lib/api";
import { useHoldToExit } from "../../hooks/useHoldToExit";
import { useGameInputCapture } from "../../hooks/useGameInputCapture";
import { WebRTCPlayer } from "./WebRTCPlayer";
import {
  PS2_INPUT_STATE,
  sendGameInputHttp,
} from "../../services/gameInputService";
import styles from "./GameModeOverlay.module.css";

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

  const sendInput = useCallback(
    async ({ inputCode, ps2Button, state }) => {
      if (!gameSession?.gameSessionId) return;

      try {
        await sendGameInputHttp({
          gameSessionId: gameSession.gameSessionId,
          inputCode,
          ps2Button,
          state,
        });
      } catch (error) {
        console.error("Erro ao enviar input:", error);
      }
    },
    [gameSession?.gameSessionId]
  );

  useGameInputCapture({
    enabled: open && Boolean(gameSession?.gameSessionId),
    bindings: controlBindings,
    onInputDown: ({ inputCode, ps2Button }) => {
      sendInput({
        inputCode,
        ps2Button,
        state: PS2_INPUT_STATE.DOWN,
      });
    },
    onInputUp: ({ inputCode, ps2Button }) => {
      sendInput({
        inputCode,
        ps2Button,
        state: PS2_INPUT_STATE.UP,
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
    <section className={styles.overlay}>
      <div className={styles.player}>
        <div className={styles.placeholder}>
          <WebRTCPlayer gameSession={gameSession} />

          <div className={styles.statusPanel}>
            {coverUrl && <img src={coverUrl} alt={game?.title || "Jogo"} />}

            <div>
              <span>Modo jogo</span>
              <h1>{game?.title || "Iniciando jogo"}</h1>

              <p>
                {loading
                  ? "Iniciando sessão do emulador..."
                  : gameSession?.gameSessionId
                    ? "Sessão iniciada. Conecte a transmissão quando o host estiver pronto."
                    : "Preparando sessão..."}
              </p>

              <small>
                Segure <strong>F8</strong> por 5 segundos para encerrar.
              </small>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.devExit}
          onClick={onExit}
          title="Encerrar sessão"
        >
          Encerrar
        </button>

        {exitProgress > 0 && (
          <div className={styles.exitIndicator}>
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