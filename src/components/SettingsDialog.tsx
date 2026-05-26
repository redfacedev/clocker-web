import { useState } from 'react';
import { DEFAULT_DELETE_PHRASE } from '../utils/SettingsDefaults';
import { LocalStorage } from '../utils/LocalStorage';
import './SettingsDialog.css';

interface Props {
  onClose: () => void;
}

function SettingsDialog({ onClose }: Props) {
  const [deletePhrase, setDeletePhrase] = useState(LocalStorage.getDeletePhrase());

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Settings</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="setting setting-slider setting-text-entry">
          <div className="setting-title-row">
            <h3>Bulk Delete Confirmation Phrase</h3>
            <button
              className="btn-reset"
              onClick={() => {
                setDeletePhrase(DEFAULT_DELETE_PHRASE);
                LocalStorage.setDeletePhrase(DEFAULT_DELETE_PHRASE);
              }}
              title="Reset to default"
            >↻</button>
          </div>
          <input
            type="text"
            value={deletePhrase}
            onChange={(e) => {
              setDeletePhrase(e.target.value);
              LocalStorage.setDeletePhrase(e.target.value);
            }}
            style={{ width: '100%', marginTop: '8px', fontSize: '1.0em' }}
          />
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog;
