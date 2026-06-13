import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/app-context';
import Sidebar from './components/layout/Sidebar';
import HomeView from './components/home/HomeView';
import StudioView from './components/studio/StudioView';
import SettingsView from './components/settings/SettingsView';
import PlayerBar from './components/player/PlayerBar';
import FullscreenLyrics from './components/player/FullscreenLyrics';
import QueueCountdownOverlay from './components/player/QueueCountdownOverlay';
import LyricsEditorModal from './components/lyrics/LyricsEditorModal';
import CreatePlaylistModal from './components/playlists/CreatePlaylistModal';

function AppLayout() {
  const [activeTab, setActiveTab] = useState('home');
  const { playback } = useApp();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1, padding: '20px', paddingBottom: playback.playback.is_playing ? '120px' : '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '100vh' }}>
        {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} />}
        {activeTab === 'studio' && <StudioView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <PlayerBar />
      <FullscreenLyrics />
      <LyricsEditorModal />
      <CreatePlaylistModal />
      <QueueCountdownOverlay />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
