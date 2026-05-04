import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useGamepadMapper } from "../hooks/useGamepadMapper";
import { api } from "../lib/api";
import ps2ControllerImage from "../assets/ps2-controller.png";

const CONTROL_GROUPS_LEFT = [
  {
    title: "DIRECIONAIS",
    items: [
      { key: "dpadUp", label: "Para cima" },
      { key: "dpadLeft", label: "Esquerda" },
      { key: "dpadRight", label: "Direita" },
      { key: "dpadDown", label: "Para baixo" },
    ],
  },
  {
    title: "ANALÓGICO ESQUERDO",
    items: [
      { key: "leftAnalogUp", label: "Para cima" },
      { key: "leftAnalogLeft", label: "Esquerda" },
      { key: "leftAnalogRight", label: "Direita" },
      { key: "leftAnalogDown", label: "Para baixo" },
    ],
  },
  {
    title: "OMBROS ESQUERDOS",
    items: [
      { key: "l2", label: "L2" },
      { key: "l1", label: "L1" },
      { key: "l3", label: "L3 (Pressionar analógico)" },
    ],
  },
];

const CONTROL_GROUPS_RIGHT = [
  {
    title: "BOTÕES FACIAIS",
    items: [
      { key: "triangle", label: "△ Triângulo" },
      { key: "circle", label: "○ Círculo" },
      { key: "cross", label: "× Cruz" },
      { key: "square", label: "□ Quadrado" },
    ],
  },
  {
    title: "ANALÓGICO DIREITO",
    items: [
      { key: "rightAnalogUp", label: "Para cima" },
      { key: "rightAnalogLeft", label: "Esquerda" },
      { key: "rightAnalogRight", label: "Direita" },
      { key: "rightAnalogDown", label: "Para baixo" },
    ],
  },
  {
    title: "OMBROS DIREITOS",
    items: [
      { key: "r2", label: "R2" },
      { key: "r1", label: "R1" },
      { key: "r3", label: "R3 (Pressionar analógico)" },
    ],
  },
];

const CENTER_CONTROLS = [
  { key: "select", title: "SELECT" },
  { key: "analog", title: "ANALÓGICO" },
  { key: "start", title: "START" },
];

function formatKey(code) {
  if (!code) return "Definir";

  const names = {
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Space: "Espaço",
    Enter: "Enter",
    Backspace: "Backspace",
    Tab: "Tab",
    ShiftLeft: "Shift",
    ShiftRight: "Shift",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    AltLeft: "Alt",
    AltRight: "Alt",
    Escape: "Esc",
  };

  if (names[code]) return names[code];

  if (code.startsWith("Key")) return code.replace("Key", "");
  if (code.startsWith("Digit")) return code.replace("Digit", "");
  if (code.startsWith("Numpad")) return code.replace("Numpad", "Num ");

  if (code.startsWith("GamepadButton")) {
    return `Botão ${code.replace("GamepadButton", "")}`;
  }

  if (code.startsWith("GamepadAxis")) {
    return code
      .replace("GamepadAxis", "Eixo ")
      .replace("+", " +")
      .replace("-", " -");
  }

  return code;
}

function ControlPanel({ title, items, bindings, listeningKey, onListen }) {
  return (
    <section className="controls-panel">
      <h2>
        <span />
        {title}
      </h2>

      <div className="controls-panel-items">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`control-bind-row ${
              listeningKey === item.key ? "listening" : ""
            }`}
            onClick={() => onListen(item.key)}
          >
            <span>{item.label}</span>
            <strong>
              {listeningKey === item.key
                ? "Pressione..."
                : formatKey(bindings[item.key])}
            </strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function CenterControlBox({ item, bindings, listeningKey, onListen }) {
  return (
    <button
      type="button"
      className={`center-control-box ${
        listeningKey === item.key ? "listening" : ""
      }`}
      onClick={() => onListen(item.key)}
    >
      <span>{item.title}</span>
      <strong>
        {listeningKey === item.key
          ? "Pressione uma tecla..."
          : formatKey(bindings[item.key])}
      </strong>
    </button>
  );
}

export default function ControlsSetup({ onBack }) {
  const [bindings, setBindings] = useState({});
  const [defaultBindings, setDefaultBindings] = useState({});
  const [requiredBindings, setRequiredBindings] = useState([]);
  const [listeningKey, setListeningKey] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const completedCount = useMemo(() => {
    return requiredBindings.filter((key) => Boolean(bindings[key])).length;
  }, [bindings, requiredBindings]);

  const isComplete = useMemo(() => {
    return requiredBindings.length > 0 && completedCount === requiredBindings.length;
  }, [completedCount, requiredBindings]);

  useEffect(() => {
    async function loadControls() {
      try {
        const data = await api("/api/controls/me");

        setBindings(data.profile?.bindings || {});
        setDefaultBindings(data.defaultBindings || {});
        setRequiredBindings(data.requiredBindings || []);
      } catch (err) {
        setMessage(err.message || "Erro ao carregar controles.");
      } finally {
        setLoading(false);
      }
    }

    loadControls();
  }, []);

  const saveInput = useCallback((code) => {
    if (!listeningKey) return;

    setBindings((current) => ({
      ...current,
      [listeningKey]: code,
    }));

    setListeningKey(null);
  }, [listeningKey]);

  useEffect(() => {
    if (!listeningKey) return;

    function handleKeyDown(event) {
      event.preventDefault();

      if (event.code === "Escape") {
        setListeningKey(null);
        return;
      }

      saveInput(event.code);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [listeningKey, saveInput]);

  useGamepadMapper({
    enabled: Boolean(listeningKey),
    onInput: (input) => {
      saveInput(input.code);
    },
  });

  async function saveControls() {
    setSaving(true);
    setMessage("");

    try {
      const data = await api("/api/controls/me", {
        method: "PUT",
        body: JSON.stringify({
          profileName: "Padrão",
          bindings,
        }),
      });

      setMessage(data.message || "Controles salvos.");
    } catch (err) {
      setMessage(err.message || "Erro ao salvar controles.");
    } finally {
      setSaving(false);
    }
  }

  function restoreDefault() {
    setBindings(defaultBindings);
    setMessage("Mapeamento padrão carregado. Clique em salvar para confirmar.");
  }

  if (loading) {
    return (
      <main className="controls-page">
        <p className="muted">Carregando controles...</p>
      </main>
    );
  }

  return (
    <main className="controls-page">
      <section className="controls-shell">
        <header className="controls-header">
          <div>
            <h1>Configurar controles</h1>
            <p>Mapeie os comandos do seu controle antes de jogar.</p>
          </div>

          <div className={isComplete ? "controls-status complete" : "controls-status"}>
            {completedCount}/{requiredBindings.length} definidos
          </div>
        </header>

        {message && (
          <div className="controls-message">
            {message}
          </div>
        )}

        {listeningKey && (
          <div className="controls-message">
            Aguardando teclado ou controle Bluetooth. Aperte ESC para cancelar.
          </div>
        )}

        <section className="controls-layout">
          <div className="controls-column">
            {CONTROL_GROUPS_LEFT.map((group) => (
              <ControlPanel
                key={group.title}
                title={group.title}
                items={group.items}
                bindings={bindings}
                listeningKey={listeningKey}
                onListen={setListeningKey}
              />
            ))}
          </div>

          <div className="controller-stage">
            <div className="center-controls">
              {CENTER_CONTROLS.map((item) => (
                <CenterControlBox
                  key={item.key}
                  item={item}
                  bindings={bindings}
                  listeningKey={listeningKey}
                  onListen={setListeningKey}
                />
              ))}
            </div>

<div className="ps2-controller-image-wrap">
  <img
    src={ps2ControllerImage}
    alt="Controle PlayStation 2"
    className="ps2-controller-image"
  />
</div>

            <div className="controls-tip">
              Dica: clique em qualquer campo e pressione uma tecla ou botão do controle.
            </div>
          </div>

          <div className="controls-column">
            {CONTROL_GROUPS_RIGHT.map((group) => (
              <ControlPanel
                key={group.title}
                title={group.title}
                items={group.items}
                bindings={bindings}
                listeningKey={listeningKey}
                onListen={setListeningKey}
              />
            ))}
          </div>
        </section>

        <footer className="controls-actions">
          <button type="button" className="ghost" onClick={onBack}>
            ← Voltar
          </button>

          <div>
            <button type="button" className="ghost" onClick={restoreDefault}>
              Restaurar padrão
            </button>

            <button type="button" onClick={saveControls} disabled={saving}>
              {saving ? "Salvando..." : "Salvar configuração"}
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}