// src/screens/settings/SettingsScreen.tsx
// App settings — theme toggle and archived logs entry.

import './SettingsScreen.css';

interface SettingsScreenProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenArchived: () => void;
  archivedCount: number;
}

export const SettingsScreen = ({
  theme,
  onToggleTheme,
  onOpenArchived,
  archivedCount,
}: SettingsScreenProps) => (
  <div className="screen-page settings-screen">
    <header className="screen-page__header settings-screen__header">
      <h1 className="settings-screen__title">Settings</h1>
    </header>

    <div className="screen-page__scroll settings-screen__body">
      <SettingsSection label="General">
        <SettingsRow
          icon="inventory_2"
          label="Archived Logs"
          detail={archivedCount > 0 ? String(archivedCount) : undefined}
          onTap={onOpenArchived}
          accessory="chevron"
        />
        <SettingsRow
          icon={theme === 'dark' ? 'dark_mode' : 'light_mode'}
          label="Theme"
          detail={theme === 'dark' ? 'Dark' : 'Light'}
          accessory="toggle"
          toggleValue={theme === 'dark'}
          onToggle={onToggleTheme}
        />
      </SettingsSection>
    </div>
  </div>
);

const SettingsSection = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="settings-section">
    <span className="settings-section__label">{label}</span>
    <div className="settings-section__rows">{children}</div>
  </div>
);

interface SettingsRowProps {
  icon: string;
  label: string;
  detail?: string;
  accessory?: 'chevron' | 'toggle';
  toggleValue?: boolean;
  onTap?: () => void;
  onToggle?: () => void;
}

const SettingsRow = ({
  icon,
  label,
  detail,
  accessory,
  toggleValue,
  onTap,
  onToggle,
}: SettingsRowProps) => {
  const handleClick = () => {
    if (accessory === 'toggle') onToggle?.();
    else onTap?.();
  };

  return (
    <button
      type="button"
      className="settings-row"
      onClick={handleClick}
      disabled={!onTap && !onToggle}
    >
      <span className="material-symbols-rounded settings-row__icon">{icon}</span>
      <span className="settings-row__label">{label}</span>
      <div className="settings-row__right">
        {detail && <span className="settings-row__detail">{detail}</span>}
        {accessory === 'chevron' && (
          <span className="material-symbols-rounded settings-row__chevron">chevron_right</span>
        )}
        {accessory === 'toggle' && (
          <div className={`toggle ${toggleValue ? 'toggle--on' : ''}`} aria-label="Toggle">
            <div className="toggle__thumb" />
          </div>
        )}
      </div>
    </button>
  );
};
