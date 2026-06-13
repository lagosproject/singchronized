import { useRef, useState } from 'react';

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Comma-separated artist chips with autocomplete from existing artists.
 * Controlled via `chips` / `setChips`; exposes the pending free text through
 * `input` / `setInput` so the parent can include it on submit.
 */
export default function ArtistChipInput({ chips, setChips, input, setInput, existingArtists }) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const inputRef = useRef(null);

  const addChip = (text) => {
    if (!text) return;
    const parts = text.split(',').map(p => p.trim()).filter(Boolean);
    setChips(prev => {
      const next = [...prev];
      parts.forEach(p => {
        if (!next.includes(p)) next.push(p);
      });
      return next;
    });
    setInput('');
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val.includes(',')) {
      const parts = val.split(',');
      const completedParts = parts.slice(0, -1).map(p => p.trim()).filter(Boolean);
      const lastPart = parts[parts.length - 1];

      if (completedParts.length > 0) {
        setChips(prev => {
          const next = [...prev];
          completedParts.forEach(p => {
            if (!next.includes(p)) next.push(p);
          });
          return next;
        });
      }
      setInput(lastPart);
    } else {
      setInput(val);
    }
    setShowAutocomplete(true);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    addChip(e.clipboardData.getData('text'));
  };

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Artist Name</label>
      <div
        className="chip-input-container"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '10px',
          borderRadius: '8px',
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          alignItems: 'center',
          cursor: 'text',
          minHeight: '42px',
          boxSizing: 'border-box'
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((chip, idx) => (
          <span
            key={idx}
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--primary-glow)',
              color: 'white',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            {chip}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setChips(prev => prev.filter((_, i) => i !== idx));
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                padding: 0,
                fontSize: '0.9rem',
                lineHeight: 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addChip(input);
            } else if (e.key === 'Backspace' && !input && chips.length > 0) {
              setChips(prev => prev.slice(0, -1));
            }
          }}
          onPaste={handlePaste}
          onFocus={() => setShowAutocomplete(true)}
          onBlur={() => {
            // Allow click events on the autocomplete list to fire first
            setTimeout(() => setShowAutocomplete(false), 200);
          }}
          placeholder={chips.length === 0 ? "e.g. Drake, Future" : ""}
          style={{
            flex: 1,
            minWidth: '120px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'white',
            padding: 0,
            fontSize: '0.9rem'
          }}
        />
      </div>

      {showAutocomplete && input.trim() && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 100,
          maxHeight: '150px',
          overflowY: 'auto',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}>
          {existingArtists
            .filter(artist =>
              normalizeText(artist).includes(normalizeText(input.trim())) &&
              !chips.includes(artist)
            )
            .map((artist) => (
              <button
                key={artist}
                type="button"
                onClick={() => addChip(artist)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {artist}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
