import React from 'react';

export function AdminGameForm({
  form,
  selectedGame,
  loading,
  editingGameId,
  onChange,
  onSubmit,
  onCancel,
}) {
  const coverPreview = form.coverUrl || selectedGame?.coverUrl;

  return (
    <aside className="admin-editor">
      <div className="admin-editor-header">
        <div className="admin-editor-cover">
          {coverPreview ? (
            <img src={coverPreview} alt={form.title || 'Capa do jogo'} />
          ) : (
            <span>Capa</span>
          )}
        </div>

        <div>
          <small>{editingGameId ? 'Editar jogo' : 'Novo jogo'}</small>
          <h2>{form.title || 'Adicionar jogo'}</h2>
          <p className="muted">PlayStation 2</p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        <label>
          Título
          <input
            value={form.title}
            onChange={(event) => onChange('title', event.target.value)}
            placeholder="Ex: Resident Evil 4"
            required
          />
        </label>

        <label>
          Serial
          <input
            value={form.serial}
            onChange={(event) => onChange('serial', event.target.value.toUpperCase())}
            placeholder="Ex: SLES-53702"
            required
          />
        </label>

        <label>
          Caminho da ISO
          <input
            value={form.isoPath}
            onChange={(event) => onChange('isoPath', event.target.value)}
            placeholder="C:\Users\chaylon\Desktop\ps2 emulator\jogo\Jogo.iso"
            required
          />
        </label>

        <label>
          URL da capa
          <input
            value={form.coverUrl}
            onChange={(event) => onChange('coverUrl', event.target.value)}
            placeholder="Deixe vazio para gerar pelo serial"
          />
        </label>

        <label>
          Descrição
          <textarea
            value={form.description}
            onChange={(event) => onChange('description', event.target.value)}
            placeholder="Descrição do jogo"
            rows={5}
          />
        </label>

        <label className="checkbox-field">
          <span>Ativo</span>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onChange('isActive', event.target.checked)}
          />
        </label>

        <div className="admin-form-actions">
          <button
            type="button"
            className="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>

          <button disabled={loading}>
            {loading
              ? 'Salvando...'
              : editingGameId
                ? 'Salvar alterações'
                : 'Cadastrar jogo'}
          </button>
        </div>
      </form>
    </aside>
  );
}