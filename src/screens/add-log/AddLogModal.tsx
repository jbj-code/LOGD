// src/screens/add-log/AddLogModal.tsx
// Modal form for creating a new log — name, icon picker, horizontally scrollable palette swatches.

import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/modal/Modal';
import { LogIcon } from '../../components/log-icon/LogIcon';
import { LOG_COLORS } from '../../styles/theme';
import { AVAILABLE_ICONS } from '../../constants/icons';
import './AddLogModal.css';

interface AddLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; icon: string; color: string }) => void;
}

type ModalView = 'form' | 'icons';

export const AddLogModal = ({ isOpen, onClose, onAdd }: AddLogModalProps) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(AVAILABLE_ICONS[0]);
  const [color, setColor] = useState<(typeof LOG_COLORS)[number]>(LOG_COLORS[0]);
  const [view, setView] = useState<ModalView>('form');

  const resetForm = () => {
    setName('');
    setIcon(AVAILABLE_ICONS[0]);
    setColor(LOG_COLORS[0]);
    setView('form');
  };

  const commitCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ name: trimmed, icon, color });
    resetForm();
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    commitCreate();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectIcon = (ic: string) => {
    setIcon(ic);
    setView('form');
  };

  const sheetClass = [
    'modal-sheet--stacked',
    'modal-sheet--add-log',
    view === 'icons' ? 'modal-sheet--add-log-icons' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const canSubmit = name.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={view === 'form' ? 'Add New Log' : 'Choose Icon'}
      sheetClassName={sheetClass}
    >
      {view === 'form' ? (
        <form className="add-log add-log--stacked" onSubmit={handleSubmit} noValidate>
          <div className="add-log__scroll">
            <div className="add-log__preview">
              <button
                type="button"
                className="add-log__preview-btn"
                onClick={() => setView('icons')}
                aria-label="Change icon"
              >
                <LogIcon symbol={icon} color={color} size="lg" showEditBadge />
                <span className="add-log__preview-hint">Tap to change icon</span>
              </button>
            </div>

            <div className="add-log__field">
              <label className="add-log__label" htmlFor="log-name">
                Log Name
              </label>
              <input
                id="log-name"
                name="logName"
                type="text"
                className="add-log__input"
                placeholder="e.g. Stretching"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                maxLength={40}
              />
            </div>

            <div className="add-log__field">
              <span className="add-log__label" id="log-color-label">
                Color
              </span>
              <div
                className="add-log__color-strip-outer"
                role="listbox"
                aria-labelledby="log-color-label"
              >
                <div className="add-log__color-strip">
                  {LOG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={c === color}
                      className={`add-log__color-swatch ${c === color ? 'add-log__color-swatch--active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
              <p className="add-log__color-hint">Swipe for more colors</p>
            </div>
          </div>

          <div className="add-log__footer">
            <button
              type="submit"
              className={`add-log__submit ${canSubmit ? '' : 'add-log__submit--inactive'}`}
              style={{ backgroundColor: color }}
              disabled={!canSubmit}
            >
              Create Log
            </button>
          </div>
        </form>
      ) : (
        <div className="icon-picker icon-picker--in-sheet">
          <button type="button" className="icon-picker__back" onClick={() => setView('form')}>
            <span className="material-symbols-rounded">arrow_back_ios</span>
            Back to form
          </button>
          <div className="icon-picker__grid">
            {AVAILABLE_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`icon-picker__btn ${ic === icon ? 'icon-picker__btn--active' : ''}`}
                onClick={() => handleSelectIcon(ic)}
                aria-pressed={ic === icon}
                aria-label={ic}
              >
                <LogIcon symbol={ic} color={color} size="grid" />
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};
