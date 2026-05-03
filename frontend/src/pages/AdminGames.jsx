import React, { useEffect, useMemo, useState } from "react";

import { api, apiUpload } from "../lib/api";
import { DashboardTopbar } from "../components/layout/DashboardTopbar";
import { AdminGameForm } from "../components/admin/AdminGameForm";
import { AdminGamesTable } from "../components/admin/AdminGamesTable";
import { MessageBox } from "../components/ui/MessageBox";

const emptyForm = {
  title: "",
  description: "",
  serial: "",
  isoPath: "",
  coverUrl: "",
  isActive: true,
};

export default function AdminGames({ user, onBack, onLogout }) {
  const [games, setGames] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingGameId, setEditingGameId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGames, setLoadingGames] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const editingGame = useMemo(() => {
    return games.find((game) => game.id === editingGameId) || null;
  }, [games, editingGameId]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        game.title?.toLowerCase().includes(term) ||
        game.serial?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && game.isActive) ||
        (statusFilter === "inactive" && !game.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [games, search, statusFilter]);

  async function loadGames() {
    setLoadingGames(true);

    try {
      const data = await api("/api/admin/games");
      setGames(data.games || []);
    } catch (err) {
      setMessage(err.message || "Erro ao carregar jogos.");
    } finally {
      setLoadingGames(false);
    }
  }

  useEffect(() => {
    loadGames();
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startCreate() {
    setEditingGameId(null);
    setForm(emptyForm);
    setMessage("");
  }

  function startEdit(game) {
    setEditingGameId(game.id);
    setForm({
      title: game.title || "",
      description: game.description || "",
      serial: game.serial || "",
      isoPath: game.isoPath || "",
      coverUrl: game.coverUrl || "",
      isActive: Boolean(game.isActive),
    });

    setMessage("");
  }

  function cancelEdit() {
    setEditingGameId(null);
    setForm(emptyForm);
  }

  async function uploadIso(file) {
    if (!file) {
      setMessage("Selecione uma ISO antes de enviar.");
      return;
    }

    setMessage("");
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Preparando upload...");

    try {
      const formData = new FormData();

      formData.append("iso", file);

      if (form.title.trim()) {
        formData.append("title", form.title.trim());
      }

      if (form.description.trim()) {
        formData.append("description", form.description.trim());
      }

      const data = await apiUpload(
        "/api/admin/games/upload",
        formData,
        (progress) => {
          setUploadProgress(progress);

          if (progress < 100) {
            setUploadStatus(`Enviando ISO... ${progress}%`);
          } else {
            setUploadStatus(
              "Upload concluído. Processando ISO, detectando serial e baixando capa...",
            );
          }
        },
      );

      setUploadProgress(100);
      setUploadStatus("Jogo cadastrado com sucesso.");
      setMessage(data.message || "ISO enviada e jogo cadastrado com sucesso.");
      setForm(emptyForm);
      setEditingGameId(null);

      await loadGames();
    } catch (err) {
      setUploadStatus("Falha no upload.");
      setMessage(err.message || "Erro ao enviar ISO.");
    } finally {
      setUploading(false);

      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus("");
      }, 1800);
    }
  }

  async function saveGame(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const path = editingGameId
        ? `/api/admin/games/${editingGameId}`
        : "/api/admin/games";

      const method = editingGameId ? "PUT" : "POST";

      const data = await api(path, {
        method,
        body: JSON.stringify(form),
      });

      setMessage(data.message || "Jogo salvo com sucesso.");
      setForm(emptyForm);
      setEditingGameId(null);
      await loadGames();
    } catch (err) {
      setMessage(err.message || "Erro ao salvar jogo.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleGameActive(game, isActive) {
    setMessage("");
    setLoading(true);

    try {
      const data = await api(`/api/admin/games/${game.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: game.title,
          description: game.description || "",
          serial: game.serial,
          isoPath: game.isoPath,
          coverUrl: game.coverUrl || "",
          isActive,
        }),
      });

      setMessage(data.message || "Jogo atualizado.");
      await loadGames();
    } catch (err) {
      setMessage(err.message || "Erro ao atualizar jogo.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", {
      method: "POST",
    });

    onLogout();
  }

  return (
    <main className="dashboard-page admin-dashboard">
      <DashboardTopbar
        user={user}
        currentPage="admin"
        onBack={onBack}
        onLogout={logout}
      />

      <section className="admin-page-shell">
        <div className="admin-main">
          <header className="admin-header">
            <div>
              <h1>Admin</h1>
              <p className="muted">Gerencie os jogos do catálogo.</p>
            </div>

            <button className="admin-add-button" onClick={startCreate}>
              + Adicionar jogo
            </button>
          </header>

          {message && <MessageBox variant="info">{message}</MessageBox>}

          <div className="admin-filters">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar jogo"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            <select defaultValue="ps2">
              <option value="ps2">PlayStation 2</option>
            </select>

            <select defaultValue="recent">
              <option value="recent">Mais recentes</option>
              <option value="az">A–Z</option>
            </select>
          </div>

          <AdminGamesTable
            games={filteredGames}
            totalGames={games.length}
            loadingGames={loadingGames}
            loading={loading}
            onEdit={startEdit}
            onToggleActive={toggleGameActive}
          />
        </div>

        <AdminGameForm
          form={form}
          selectedGame={editingGame}
          loading={loading}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadStatus={uploadStatus}
          editingGameId={editingGameId}
          onChange={updateForm}
          onSubmit={saveGame}
          onCancel={cancelEdit}
          onUploadIso={uploadIso}
        />
      </section>
    </main>
  );
}
