import { useState, useEffect } from 'react';
import { useBloomStore } from '../../core/store';
import { PersistenceService } from '../../persistence/PersistenceService';
import { GeneralSection } from './GeneralSection';
import { EcosystemSection } from './EcosystemSection';
import { ActivitySection } from './ActivitySection';
import { VisualsSection } from './VisualsSection';
import { AboutSection } from './AboutSection';

type Section = 'general' | 'ecosystem' | 'activity' | 'visuals' | 'about';

const NAV: { id: Section; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'ecosystem', label: 'Ecosystem' },
  { id: 'activity', label: 'Activity' },
  { id: 'visuals', label: 'Visuals' },
  { id: 'about', label: 'About' },
];

export function ControlPanel() {
  const [active, setActive] = useState<Section>('general');
  const setSettings = useBloomStore(s => s.setSettings);
  const setIdentity = useBloomStore(s => s.setIdentity);

  // Separate webview = own store instance. Load settings + identity on open.
  useEffect(() => {
    PersistenceService.loadSettings()
      .then(s => { if (s) setSettings(s); })
      .catch(console.error);
    PersistenceService.loadIdentity()
      .then(id => { if (id) setIdentity(id); })
      .catch(console.error);
  }, [setSettings, setIdentity]);

  return (
    <div className="cp-root">
      <div className="cp-sidebar">
        <div className="cp-brand">Bloom</div>
        {NAV.map(n => (
          <div
            key={n.id}
            className={`cp-nav-item ${active === n.id ? 'active' : ''}`}
            onClick={() => setActive(n.id)}
          >
            {n.label}
          </div>
        ))}
      </div>
      <div className="cp-content">
        {active === 'general' && <GeneralSection />}
        {active === 'ecosystem' && <EcosystemSection />}
        {active === 'activity' && <ActivitySection />}
        {active === 'visuals' && <VisualsSection />}
        {active === 'about' && <AboutSection />}
      </div>
    </div>
  );
}
