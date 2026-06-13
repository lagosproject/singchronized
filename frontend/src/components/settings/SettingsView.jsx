import { useState } from 'react';
import { Cpu, Music, Radio } from 'lucide-react';
import AudioSettings from './AudioSettings';
import QueueSettings from './QueueSettings';
import AISettings from './AISettings';

const SECTIONS = [
  { id: 'audio', label: 'Audio Routing', icon: Radio, component: AudioSettings },
  { id: 'queue', label: 'Queue Settings', icon: Music, component: QueueSettings },
  { id: 'ai', label: 'Whisper AI Model', icon: Cpu, component: AISettings }
];

export default function SettingsView() {
  const [activeSection, setActiveSection] = useState('audio');
  const ActiveComponent = SECTIONS.find(s => s.id === activeSection).component;

  return (
    <div style={{ display: 'flex', gap: '32px', width: '100%', flex: 1 }}>
      {/* Local sub-navigation menu */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`interactive-btn ${activeSection === id ? '' : 'secondary-btn'}`}
            style={{ justifyContent: 'flex-start', width: '100%' }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <ActiveComponent />
      </div>
    </div>
  );
}
