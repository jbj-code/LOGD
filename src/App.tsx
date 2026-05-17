// src/App.tsx
// Root component — manages navigation state and wires screens to data hooks.

import { useEffect, useState } from 'react';
import type { NavScreen, Tab } from './types';
import { useLogsStore } from './hooks/use-logs-store';
import { useTheme } from './hooks/use-theme';
import { today } from './utils/date';
import { BottomNav } from './components/bottom-nav/BottomNav';
import { FabMenu } from './components/fab-menu/FabMenu';
import { SplashScreen } from './components/splash/SplashScreen';
import { LogsScreen } from './screens/logs/LogsScreen';
import { LogDetailScreen } from './screens/logs/LogDetailScreen';
import { AddLogModal } from './screens/add-log/AddLogModal';
import { QuickLogModal } from './screens/quick-log/QuickLogModal';
import { StatsScreen } from './screens/stats/StatsScreen';
import { CalendarScreen } from './screens/calendar/CalendarScreen';
import { SettingsScreen } from './screens/settings/SettingsScreen';
import { ArchivedLogsScreen } from './screens/settings/ArchivedLogsScreen';
import './App.css';

const App = () => {
  const {
    logs,
    activeLogs,
    archivedLogs,
    addLog,
    deleteLog,
    archiveLog,
    toggleEntry,
    getLog,
    usesSupabase,
    logsLoading,
    logsError,
    refetchLogs,
    updateLog,
  } = useLogsStore();
  const { theme, toggleTheme } = useTheme();

  const [screen, setScreen] = useState<NavScreen>({ tab: 'logs', view: 'list' });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const [splashMinElapsed, setSplashMinElapsed] = useState(false);
  const [splashHoldMs] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 280
      : 1480,
  );

  useEffect(() => {
    const id = window.setTimeout(() => setSplashMinElapsed(true), splashHoldMs);
    return () => window.clearTimeout(id);
  }, [splashHoldMs]);

  const showSplash = !splashMinElapsed || (usesSupabase && logsLoading);

  useEffect(() => {
    queueMicrotask(() => setFabMenuOpen(false));
  }, [screen]);

  useEffect(() => {
    if (screen.tab !== 'logs' || screen.view !== 'detail') return;
    const id = 'logId' in screen ? screen.logId : undefined;
    if (typeof id !== 'string' || !logs.some((l) => l.id === id)) {
      queueMicrotask(() => setScreen({ tab: 'logs', view: 'list' }));
    }
  }, [screen, logs]);

  const navigateToTab = (tab: Tab) => {
    setScreen(
      tab === 'logs'
        ? { tab, view: 'list' }
        : tab === 'stats'
          ? { tab, view: 'main' }
          : tab === 'calendar'
            ? { tab, view: 'main' }
            : { tab: 'settings', view: 'main' },
    );
  };

  const navigateToDetail = (logId: string) => {
    setScreen({ tab: 'logs', view: 'detail', logId });
  };

  const navigateBack = () => {
    setScreen({ tab: 'logs', view: 'list' });
  };

  const handleArchiveFromDetail = (logId: string) => archiveLog(logId, true);

  const showLogsFab = screen.tab === 'logs' && screen.view === 'list';

  const logsDetailId =
    screen.tab === 'logs' && screen.view === 'detail' && 'logId' in screen ? screen.logId : undefined;
  const detailLog = logsDetailId ? getLog(logsDetailId) : undefined;

  const showArchivedOverlay = screen.tab === 'settings' && screen.view === 'archived';

  if (showSplash) {
    return (
      <div className="app">
        <SplashScreen />
      </div>
    );
  }

  if (usesSupabase && logsError) {
    return (
      <div className="app app--boot">
        <p className="app-boot__text app-boot__text--error">{logsError}</p>
        <button type="button" className="app-boot__retry" onClick={() => void refetchLogs()}>
          Retry
        </button>
      </div>
    );
  }

  const renderMain = () => {
    switch (screen.tab) {
      case 'logs':
        return (
          <LogsScreen
            logs={activeLogs}
            onLogSelect={navigateToDetail}
            onAddLog={() => setAddModalOpen(true)}
          />
        );

      case 'stats':
        return <StatsScreen logs={activeLogs} />;

      case 'calendar':
        return <CalendarScreen logs={activeLogs} />;

      case 'settings':
        return (
          <SettingsScreen
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenArchived={() => setScreen({ tab: 'settings', view: 'archived' })}
            archivedCount={archivedLogs.length}
          />
        );

      default:
        return (
          <LogsScreen
            logs={activeLogs}
            onLogSelect={navigateToDetail}
            onAddLog={() => setAddModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="app">
      <BottomNav activeTab={screen.tab} onTabChange={navigateToTab} />
      <main className="app__content">
        {detailLog ? (
          <div key={detailLog.id} className="app-route app-route--detail">
            <LogDetailScreen
              log={detailLog}
              onBack={navigateBack}
              onToggleEntry={toggleEntry}
              onDelete={deleteLog}
              onArchive={handleArchiveFromDetail}
              onSaveNotes={(id, notes) => void updateLog(id, { notes })}
            />
          </div>
        ) : showArchivedOverlay ? (
          <div key="settings-archived" className="app-route app-route--detail">
            <ArchivedLogsScreen
              logs={archivedLogs}
              onBack={() => setScreen({ tab: 'settings', view: 'main' })}
              onRestore={(id) => void archiveLog(id, false)}
              onDelete={deleteLog}
            />
          </div>
        ) : (
          <div className="app-route app-route--scroll">{renderMain()}</div>
        )}
      </main>
      {showLogsFab && (
        <FabMenu
          isOpen={fabMenuOpen}
          onOpenChange={setFabMenuOpen}
          onNewLogType={() => setAddModalOpen(true)}
          onQuickLog={() => setQuickLogOpen(true)}
        />
      )}
      <AddLogModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addLog}
      />
      <QuickLogModal
        isOpen={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        logs={activeLogs}
        onToggleToday={(logId) => toggleEntry(logId, today())}
      />
    </div>
  );
};

export default App;
