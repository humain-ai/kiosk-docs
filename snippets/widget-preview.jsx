const { useState } = React;

/**
 * WidgetPreview — renders a realistic mock of the Humain chat widget.
 * Used on the drop-in widget documentation page as a live preview.
 */
export default function WidgetPreview() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi there! How can I help you today?' },
  ]);

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
      marginLeft: 'auto',
      marginBottom: 24,
      transition: 'height 0.25s ease',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    }}>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 64,
          right: 0,
          width: '100%',
          maxWidth: 380,
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          background: '#ffffff',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: '#1D9E75',
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
                <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Kiosk</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Always online</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
            >×</button>
          </div>

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
                  background: m.role === 'user' ? '#1D9E75' : '#f3f4f6',
                  color: m.role === 'user' ? 'white' : '#111827',
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
            borderTop: '1px solid #e5e7eb',
            padding: 10,
            display: 'flex',
            gap: 8,
          }}>
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#1D9E75',
                color: 'white',
                fontWeight: 600,
                fontSize: 13,
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                opacity: input.trim() ? 1 : 0.5,
              }}
            >Send</button>
          </div>
        </div>
      )}

      {/* FAB trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#1D9E75',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(29,158,117,0.4)',
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
        right: 0,
        fontSize: 11,
        color: '#9ca3af',
        whiteSpace: 'nowrap',
      }}>
        ↑ Live preview — click to open
      </div>
    </div>
  );
}
