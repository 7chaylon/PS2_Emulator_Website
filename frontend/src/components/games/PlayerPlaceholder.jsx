import React from "react";

import styles from "./PlayerPlaceholder.module.css";

export function PlayerPlaceholder() {
  return (
    <div className={styles.placeholder}>
      <div>
        <strong>Área do WebRTC</strong>
        <p>
          O vídeo do PCSX2 vai aparecer aqui quando a transmissão estiver pronta.
        </p>
      </div>
    </div>
  );
}