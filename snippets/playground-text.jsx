const { useState, useRef, useCallback } = React;

export const ENVS = {
  sandbox: 'https://sandbox.api.humain.ai',
  live: 'https://api.humain.ai',
};

export function Label({ children }) {
  return (
    <label style={{
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-secondary, #6b7280)',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {children}
    </label>
  );
}

export function Panel({ title, children, mono = false }) {
  return (
    <div style={{
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 8,
      overflow: 'hidden',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        padding: '8px 12px',
        background: 'var(--surface-muted, #f9fafb)',
        borderBottom: '1px solid var(--border, #e5e7eb)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary, #6b7280)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {title}
      </div>
      <pre style={{
        margin: 0,
        padding: 12,
        fontSize: 12,
        lineHeight: 1.6,
        fontFamily: mono ? 'monospace' : 'inherit',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: 260,
        overflowY: 'auto',
        color: 'var(--text-primary, #111827)',
        background: 'transparent',
      }}>
        {children || <span style={{ color: 'var(--text-muted, #9ca3af)' }}>—</span>}
      </pre>
    </div>
  );
}

export function Message({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 8,
    }}>
      <div style={{
        maxWidth: '75%',
        padding: '8px 12px',
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isUser
          ? 'var(--primary, #0E50BD)'
          : 'var(--surface-muted, #f3f4f6)',
        color: isUser ? 'white' : 'var(--text-primary, #111827)',
        fontSize: 14,
        lineHeight: 1.5,
      }}>
        {text}
      </div>
    </div>
  );
}

export default function PlaygroundText() {
  const [credential, setCredential] = useState('');
  const [env, setEnv] = useState('sandbox');
  const [mode, setMode] = useState('rest');
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawRequest, setRawRequest] = useState('');
  const [rawResponse, setRawResponse] = useState('');
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const baseUrl = ENVS[env];
  const headers = {
    'Authorization': `Bearer ${credential}`,
    'Content-Type': 'application/json',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const appendMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() }]);
    setTimeout(scrollToBottom, 50);
  };

  // ── Open / close session ──────────────────────────────────────────────────

  const openSession = useCallback(async () => {
    if (!credential.trim()) { setError('Paste a device credential first.'); return; }
    setError(null);
    setLoading(true);

    const reqBody = { mode: 'text' };
    setRawRequest(`POST ${baseUrl}/v1/sessions\n\n${JSON.stringify(reqBody, null, 2)}`);

    try {
      const res = await fetch(`${baseUrl}/v1/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody),
      });
      const data = await res.json();
      setRawResponse(`HTTP ${res.status}\n\n${JSON.stringify(data, null, 2)}`);

      if (!res.ok) throw new Error(data.message ?? data.error);
      setSessionId(data.session_id);
      setMessages([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [credential, baseUrl]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);

    const url = `${baseUrl}/v1/sessions/${sessionId}/end`;
    setRawRequest(`POST ${url}`);

    try {
      const res = await fetch(url, { method: 'POST', headers });
      setRawResponse(`HTTP ${res.status}`);
      setSessionId(null);
      wsRef.current?.close();
      wsRef.current = null;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, baseUrl, credential]);

  // ── REST send ─────────────────────────────────────────────────────────────

  const sendRest = useCallback(async (text) => {
    const url = `${baseUrl}/v1/sessions/${sessionId}/message`;
    const reqBody = { input: text };
    setRawRequest(`POST ${url}\n\n${JSON.stringify(reqBody, null, 2)}`);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(reqBody),
    });
    const data = await res.json();
    setRawResponse(`HTTP ${res.status}\n\n${JSON.stringify(data, null, 2)}`);

    if (!res.ok) throw new Error(data.message ?? data.error);
    appendMessage('ai', data.response);
  }, [sessionId, baseUrl, credential]);

  // ── WebSocket send ────────────────────────────────────────────────────────

  const sendWebSocket = useCallback(async (text) => {
    const wsUrl = baseUrl.replace(/^http/, 'ws');
    const fullUrl = `${wsUrl}/v1/sessions/${sessionId}/stream?token=${encodeURIComponent(credential)}`;

    setRawRequest(`WS CONNECT ${fullUrl.replace(/token=.*/, 'token=<redacted>')}\n\nSEND: ${JSON.stringify({ input: text })}`);

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(fullUrl);
      wsRef.current = ws;
      let buffer = '';

      ws.onopen = () => ws.send(JSON.stringify({ input: text }));

      ws.onmessage = (e) => {
        const frame = JSON.parse(e.data);
        if (frame.type === 'chunk') {
          buffer += frame.content;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'ai-streaming') {
              return [...prev.slice(0, -1), { ...last, text: buffer }];
            }
            return [...prev, { role: 'ai-streaming', text: buffer, id: Date.now() }];
          });
          setTimeout(scrollToBottom, 50);
        }
        if (frame.type === 'turn_end') {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'ai-streaming') {
              return [...prev.slice(0, -1), { role: 'ai', text: last.text, id: last.id }];
            }
            return prev;
          });
          setRawResponse(`WS TURN_END\n\n${JSON.stringify(frame, null, 2)}`);
          ws.close();
          resolve();
        }
      };

      ws.onerror = (e) => reject(new Error('WebSocket error'));
      ws.onclose = (e) => {
        if (e.code >= 4000) reject(new Error(`Session error: code ${e.code}`));
        else resolve();
      };
    });
  }, [sessionId, baseUrl, credential]);

  // ── Submit handler ────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    appendMessage('user', text);
    setLoading(true);

    try {
      if (mode === 'rest') {
        await sendRest(text);
      } else {
        await sendWebSocket(text);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [input, loading, mode, sendRest, sendWebSocket]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)', color: 'var(--text-primary, #111827)' }}>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>

        {/* Credential */}
        <div style={{ flex: '2 1 260px' }}>
          <Label>Device credential</Label>
          <input
            type="password"
            placeholder="hk_live_…"
            value={credential}
            onChange={e => setCredential(e.target.value)}
            disabled={!!sessionId}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border, #d1d5db)',
              fontSize: 13,
              fontFamily: 'monospace',
              background: 'var(--surface, #fff)',
              color: 'var(--text-primary, #111827)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Environment */}
        <div>
          <Label>Environment</Label>
          <div className="hk-mode-toggle">
            {['sandbox', 'live'].map(e => (
              <button
                key={e}
                className={env === e ? 'active' : ''}
                onClick={() => !sessionId && setEnv(e)}
                disabled={!!sessionId}
              >
                {e === 'sandbox' ? 'Sandbox' : 'Live'}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div>
          <Label>Transport</Label>
          <div className="hk-mode-toggle">
            {['rest', 'websocket'].map(m => (
              <button
                key={m}
                className={mode === m ? 'active' : ''}
                onClick={() => !sessionId && setMode(m)}
                disabled={!!sessionId}
              >
                {m === 'rest' ? 'REST' : 'WebSocket'}
              </button>
            ))}
          </div>
        </div>

        {/* Session control */}
        <div>
          <Label>Session</Label>
          {!sessionId ? (
            <button
              onClick={openSession}
              disabled={loading || !credential.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--primary, #0E50BD)',
                color: 'white',
                fontWeight: 600,
                fontSize: 13,
                cursor: loading || !credential.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !credential.trim() ? 0.6 : 1,
              }}
            >
              {loading ? 'Opening…' : 'Open session'}
            </button>
          ) : (
            <button
              onClick={endSession}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid var(--border, #d1d5db)',
                background: 'transparent',
                color: 'var(--text-primary, #111827)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              End session
            </button>
          )}
        </div>
      </div>

      {/* ── Session ID badge ───────────────────────────────────────────────── */}
      {sessionId && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 100,
          background: '#dbeafe',
          color: '#1e3a8a',
          fontSize: 12,
          fontFamily: 'monospace',
          marginBottom: 12,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1366E2', display: 'inline-block' }} />
          {sessionId}
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 6,
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          fontSize: 13,
          marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* ── Chat + raw panels ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>

        {/* Chat */}
        <div style={{
          flex: '1 1 320px',
          border: '1px solid var(--border, #e5e7eb)',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 320,
        }}>
          <div style={{
            padding: '8px 12px',
            background: 'var(--surface-muted, #f9fafb)',
            borderBottom: '1px solid var(--border, #e5e7eb)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary, #6b7280)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Conversation
          </div>
          <div style={{ flex: 1, padding: 12, overflowY: 'auto', minHeight: 200 }}>
            {messages.length === 0 && (
              <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: 13, margin: 0, textAlign: 'center', paddingTop: 32 }}>
                Open a session and send your first message.
              </p>
            )}
            {messages.map(m => (
              <Message key={m.id} role={m.role} text={m.text} />
            ))}
            {loading && !messages.some(m => m.role === 'ai-streaming') && (
              <Message role="ai" text="…" />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            borderTop: '1px solid var(--border, #e5e7eb)',
            padding: 8,
            display: 'flex',
            gap: 8,
          }}>
            <textarea
              rows={2}
              placeholder={sessionId ? 'Type a message…' : 'Open a session first'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!sessionId || loading}
              style={{
                flex: 1,
                resize: 'none',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--border, #d1d5db)',
                fontSize: 13,
                fontFamily: 'inherit',
                background: 'var(--surface, #fff)',
                color: 'var(--text-primary, #111827)',
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!sessionId || loading || !input.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--primary, #0E50BD)',
                color: 'white',
                fontWeight: 600,
                fontSize: 13,
                cursor: (!sessionId || loading || !input.trim()) ? 'not-allowed' : 'pointer',
                opacity: (!sessionId || loading || !input.trim()) ? 0.5 : 1,
                alignSelf: 'flex-end',
              }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Raw panels */}
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Panel title="Request" mono>
            {rawRequest}
          </Panel>
          <Panel title="Response" mono>
            {rawResponse}
          </Panel>
        </div>
      </div>
    </div>
  );
}
