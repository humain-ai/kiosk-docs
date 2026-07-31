
// ── Theme palettes ──────────────────────────────────────────────────────────
// LIGHT_PALETTE keeps the exact literal colors this preview has always used
// (predates this file having any theme concept at all) — changing them would
// break the byte-identical zero-prop rendering drop-in-widget.mdx depends on.
// DARK_PALETTE is a pure addition, so it's copied verbatim from kiosk-js's
// real :host([data-theme="dark"]) block in src/widget/styles.ts.
export const LIGHT_PALETTE = {
  bg: '#ffffff', surface: '#f3f4f6', border: '#e5e7eb',
  text: '#111827', textMuted: '#9ca3af',
};
export const DARK_PALETTE = {
  bg: '#1e1e2e', surface: '#2a2a3e', border: '#3a3a50',
  text: '#e8e8f0', textMuted: '#9999b0',
};

/**
 * WidgetPreview — renders a realistic mock of the Humain chat widget.
 * Props mirror kiosk-js's WidgetConfig (see /web/customisation and
 * kiosk-js/src/widget/types.ts) — this file is the visual half of the
 * Widget Interface Builder (/web/widget-builder), and is also embedded
 * bare (zero props) on the drop-in widget page as a static example.
 *
 * Two intentional departures from kiosk-js's real defaults, both scoped to
 * keep the bare `<WidgetPreview />` call in drop-in-widget.mdx pixel-identical
 * to its pre-builder appearance:
 *  - `theme="auto"` renders as light here (no prefers-color-scheme query) —
 *    the original static mock was always light. Pick `theme="dark"` explicitly
 *    to preview the dark palette.
 *  - `showDisclosure` defaults to `false` here, though kiosk-js defaults it to
 *    `true` — the original mock never rendered a disclosure banner. The
 *    builder always passes this prop explicitly, seeded from kiosk-js's real
 *    default, so the builder's own preview is accurate either way.
 */
export default function WidgetPreview({
  position = 'bottom-right',
  theme = 'auto',
  primaryColor = '#0E50BD',
  title = 'Kiosk',
  placeholder = 'Type a message...',
  initialMessage,
  zIndex = 9999,
  showDisclosure = false,
  languageSelector,
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [messages, setMessages] = useState(
    initialMessage
      ? [{ role: 'ai', text: initialMessage }]
      : [{ role: 'ai', text: 'Hi there! How can I help you today?' }],
  );

  const isLeft = position === 'bottom-left';
  const palette = theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  const hasLangSelector = languageSelector?.enabled && (languageSelector.languages?.length ?? 0) > 0;
  const showLangPicker = hasLangSelector && !selectedLanguage;

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg = { role: 'user', text };
    const aiMsg  = { role: 'ai',   text: '[Sandbox] Thanks for your message! This is a live preview of the Humain widget.' };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{
      position: 'relative',
      height: open ? 420 : 56,
      width: '100%',
      maxWidth: 380,
      marginLeft: isLeft ? 0 : 'auto',
      marginRight: isLeft ? 'auto' : 0,
      marginBottom: 24,
      transition: 'height 0.25s ease',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      zIndex,
    }}>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 64,
          right: isLeft ? 'auto' : 0,
          left: isLeft ? 0 : 'auto',
          width: '100%',
          maxWidth: 380,
          border: `1px solid ${palette.border}`,
          borderRadius: 16,
          background: palette.bg,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
              }}>H</div>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{title}</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Always online</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
            >×</button>
          </div>

          {/* AI disclosure banner — real text comes from the session's
              disclosureText field, returned by the backend once a session is
              open; this is illustrative copy for the preview only. */}
          {showDisclosure && !showLangPicker && (
            <div style={{
              background: palette.surface,
              borderBottom: `1px solid ${palette.border}`,
              padding: '8px 12px',
              fontSize: 11,
              color: palette.textMuted,
              lineHeight: 1.4,
              flexShrink: 0,
            }}>
              You're chatting with an AI assistant. Conversations may be reviewed for quality.
            </div>
          )}

          {/* Language selector — shown before the first message when
              languageSelector.enabled and no language has been picked yet,
              matching widget.ts's #showLanguageSelector. */}
          {showLangPicker ? (
            <div style={{ padding: '16px 12px', flexShrink: 0 }}>
              <p style={{ fontSize: 13, color: palette.textMuted, margin: '0 0 10px' }}>
                Please select your language:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {languageSelector.languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setSelectedLanguage(l.code)}
                    style={{
                      background: palette.surface,
                      border: `1px solid ${palette.border}`,
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 14,
                      color: palette.text,
                      cursor: 'pointer',
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div style={{
                flex: 1,
                padding: 12,
                overflowY: 'auto',
                maxHeight: 260,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                {messages.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '78%',
                      padding: '8px 12px',
                      borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: m.role === 'user' ? primaryColor : palette.surface,
                      color: m.role === 'user' ? 'white' : palette.text,
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div style={{
                borderTop: `1px solid ${palette.border}`,
                padding: 10,
                display: 'flex',
                gap: 8,
              }}>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${palette.border}`,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit',
                    background: palette.bg,
                    color: palette.text,
                  }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: primaryColor,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    opacity: input.trim() ? 1 : 0.5,
                  }}
                >Send</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute',
          bottom: 0,
          right: isLeft ? 'auto' : 0,
          left: isLeft ? 0 : 'auto',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: primaryColor,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(14,80,189,0.4)',
          transition: 'transform 0.15s ease',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          {open ? (
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          ) : (
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" fill="white"/>
          )}
        </svg>
      </button>

      {/* Caption */}
      <div style={{
        position: 'absolute',
        bottom: -20,
        right: isLeft ? 'auto' : 0,
        left: isLeft ? 0 : 'auto',
        fontSize: 11,
        color: '#9ca3af',
        whiteSpace: 'nowrap',
      }}>
        ↑ Live preview — click to open
      </div>
    </div>
  );
}
