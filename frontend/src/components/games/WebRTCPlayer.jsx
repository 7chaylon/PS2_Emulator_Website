import React, { useRef, useState } from "react";

import { api } from "../../lib/api";
import styles from "./WebRTCPlayer.module.css";

export function WebRTCPlayer({ gameSession }) {
  const videoRef = useRef(null);
  const peerRef = useRef(null);

  const [status, setStatus] = useState("Transmissão ainda não conectada.");
  const [connecting, setConnecting] = useState(false);

  async function connectStream() {
    if (!gameSession?.gameSessionId) {
      setStatus("Nenhuma sessão ativa encontrada.");
      return;
    }

    setConnecting(true);
    setStatus("Criando conexão WebRTC...");

    try {
      const peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      });

      peerRef.current = peer;

      peer.ontrack = (event) => {
        const [stream] = event.streams;

        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }

        setStatus("Transmissão conectada.");
      };

      peer.onconnectionstatechange = () => {
        setStatus(`Estado WebRTC: ${peer.connectionState}`);
      };

      peer.addTransceiver("video", {
        direction: "recvonly",
      });

      peer.addTransceiver("audio", {
        direction: "recvonly",
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const data = await api("/api/game/webrtc/offer", {
        method: "POST",
        body: JSON.stringify({
          gameSessionId: gameSession.gameSessionId,
          offer,
        }),
      });

      if (!data.answer) {
        setStatus(data.message || "Host ainda não retornou uma resposta WebRTC.");
        return;
      }

      await peer.setRemoteDescription(data.answer);

      setStatus("Conexão WebRTC iniciada.");
    } catch (error) {
      console.error("Erro WebRTC:", error);
      setStatus(error.message || "Erro ao conectar transmissão.");
    } finally {
      setConnecting(false);
    }
  }

  function disconnectStream() {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("Transmissão encerrada.");
  }

  return (
    <div className={styles.player}>
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        playsInline
      />

      <div className={styles.overlay}>
        <strong>Player WebRTC</strong>
        <p>{status}</p>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={connectStream}
            disabled={connecting || !gameSession?.gameSessionId}
          >
            {connecting ? "Conectando..." : "Conectar transmissão"}
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={disconnectStream}
          >
            Desconectar
          </button>
        </div>
      </div>
    </div>
  );
}