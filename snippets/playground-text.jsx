const { useState, useRef, useCallback, useEffect } = React;

// There is no separate sandbox host — sandbox vs. live is determined entirely by the
// credential's prefix (hk_test_ vs hk_live_), not the URL. See /concepts/sandbox-mode.
export const API_BASE = 'https://api.humain.ai';

// ── Animated WebGL background (ported from kiosk-demo's Noctylis component) ──
// Plain WebGL + GLSL, no dependencies — safe to run directly in the docs page.

export const NOCTYLIS_VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const NOCTYLIS_FRAG = `
precision highp float;
varying vec2 vUv;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_grain;
uniform vec3 u_colors[3];

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float ratio = u_resolution.x / u_resolution.y;
  vec2 p = uv * vec2(ratio, 1.0);
  float t = u_time * 0.2;

  vec2 warp = vec2(
    snoise(p * 0.35 + t * 0.12),
    snoise(p * 0.35 - t * 0.1 + 1.7)
  );
  p += warp * 0.06;

  float n1 = snoise(p * 0.5 + t);
  float n2 = snoise(p * 0.88 - t * 0.48 + n1 * 0.75);

  float light = pow(abs(n2), 2.35) * 0.52;

  vec3 col = vec3(0.015, 0.008, 0.022);

  col += u_colors[0] * smoothstep(0.1, 1.0, n1) * 0.48;
  col += u_colors[1] * light;
  col += u_colors[2] * pow(max(n1 * 0.5 + n2 * 0.5, 0.0), 2.8) * 0.18;
  col += u_colors[2] * pow(abs(n2), 4.5) * 0.1;

  float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time);
  col += (grain - 0.5) * u_grain * 0.22;

  float edgeX = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
  float edgeY = smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.92, uv.y);
  col *= mix(0.9, 1.0, edgeX * edgeY);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function Noctylis({ colors = ['#5b21b6', '#7c3aed', '#c4b5fd'], speed = 0.25, grain = 0.2 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) return; // silently fall back to the flat --hk-kiosk-bg color

    const hexToRgb = (hex) => {
      const h = hex.replace('#', '');
      return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
      ];
    };

    const createShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, NOCTYLIS_VERT));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, NOCTYLIS_FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const locs = {
      res: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      colors: gl.getUniformLocation(program, 'u_colors'),
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, container.clientWidth * dpr);
      canvas.height = Math.max(1, container.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(container);
    }
    resize();

    let raf;
    const render = (t) => {
      gl.uniform2f(locs.res, canvas.width, canvas.height);
      gl.uniform1f(locs.time, t * 0.001 * speed);
      gl.uniform1f(locs.grain, grain);
      gl.uniform3fv(locs.colors, new Float32Array(colors.slice(0, 3).flatMap(hexToRgb)));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      if (ro) ro.disconnect();
      cancelAnimationFrame(raf);
      gl.deleteProgram(program);
    };
  }, [colors, speed, grain]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}

export function Label({ children }) {
  return (
    <label style={{
      display: 'block',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--hk-kiosk-text-dim, #a1a1aa)',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '0.15em',
      fontFamily: 'var(--hk-kiosk-mono, ui-monospace, monospace)',
    }}>
      {children}
    </label>
  );
}

export function Panel({ title, children }) {
  return (
    <div className="hk-kiosk-glass" style={{
      border: '1px solid var(--hk-kiosk-border-soft, rgba(255,255,255,0.05))',
      borderRadius: 10,
      overflow: 'hidden',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--hk-kiosk-border-soft, rgba(255,255,255,0.05))',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--hk-kiosk-text-dim, #a1a1aa)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        fontFamily: 'var(--hk-kiosk-mono, monospace)',
      }}>
        {title}
      </div>
      <pre style={{
        margin: 0,
        padding: 12,
        fontSize: 12,
        lineHeight: 1.6,
        fontFamily: 'var(--hk-kiosk-mono, monospace)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: 260,
        overflowY: 'auto',
        color: '#d4d4d8',
        background: 'transparent',
      }}>
        {children || <span style={{ color: 'var(--hk-kiosk-text-faint, #52525b)' }}>—</span>}
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
        background: isUser ? '#9333ea' : '#27272a',
        color: isUser ? '#ffffff' : '#e4e4e7',
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
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [agentUrl, setAgentUrl] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawRequest, setRawRequest] = useState('');
  const [rawResponse, setRawResponse] = useState('');
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const baseUrl = API_BASE;
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
      // agent_url is where every real-time call goes — not necessarily baseUrl.
      setAgentUrl(data.agent_url || baseUrl);
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

    const url = `${agentUrl}/v1/sessions/${sessionId}/end`;
    setRawRequest(`POST ${url}`);

    try {
      const res = await fetch(url, { method: 'POST', headers });
      setRawResponse(`HTTP ${res.status}`);
      setSessionId(null);
      setAgentUrl(null);
      wsRef.current?.close();
      wsRef.current = null;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, agentUrl, credential]);

  // ── WebSocket send ────────────────────────────────────────────────────────
  // Browsers can't set an Authorization header on a WS handshake, so mint a
  // single-use ticket first and pass it as ?ticket= instead of the raw token.

  const sendWebSocket = useCallback(async (text) => {
    const ticketUrl = `${agentUrl}/v1/sessions/${sessionId}/ws-ticket`;
    const ticketRes = await fetch(ticketUrl, { method: 'POST', headers });
    const ticketData = await ticketRes.json();
    if (!ticketRes.ok) throw new Error(ticketData.message ?? ticketData.error);

    const wsUrl = agentUrl.replace(/^http/, 'ws');
    const fullUrl = `${wsUrl}/v1/sessions/${sessionId}/ws?ticket=${encodeURIComponent(ticketData.ticket)}`;
    const outFrame = { type: 'message', content: text };

    setRawRequest(`POST ${ticketUrl}\n\nWS CONNECT ${wsUrl}/v1/sessions/${sessionId}/ws?ticket=<redacted>\n\nSEND: ${JSON.stringify(outFrame)}`);

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(fullUrl);
      wsRef.current = ws;

      ws.onopen = () => ws.send(JSON.stringify(outFrame));

      ws.onmessage = (e) => {
        const frame = JSON.parse(e.data);

        if (frame.type === 'response') {
          appendMessage('ai', frame.content);
          setRawResponse(`WS RESPONSE\n\n${JSON.stringify(frame, null, 2)}`);
          ws.close();
          resolve();
        }
        if (frame.type === 'error') {
          setRawResponse(`WS ERROR\n\n${JSON.stringify(frame, null, 2)}`);
          ws.close();
          reject(new Error(frame.message ?? frame.code));
        }
        if (frame.type === 'session_expiring') {
          setError(frame.message);
        }
      };

      ws.onerror = () => reject(new Error('WebSocket error'));
      ws.onclose = (e) => {
        // A clean close before we resolved/rejected via a frame means the
        // server hung up without sending a response — surface that too.
        if (wsRef.current === ws) reject(new Error(`Connection closed (code ${e.code})`));
      };
    });
  }, [sessionId, agentUrl, credential]);

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
      await sendWebSocket(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sendWebSocket]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="hk-kiosk-panel">
      <Noctylis />
      <div style={{ position: 'relative', zIndex: 1, padding: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        fontFamily: 'var(--hk-kiosk-mono, monospace)',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.25em',
        color: 'var(--hk-kiosk-text-muted, #71717a)',
        marginBottom: 16,
        textAlign: 'center',
      }}>
        Humain Kiosk
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>

        {/* Credential */}
        <div style={{ flex: '2 1 260px' }}>
          <Label>Device credential</Label>
          <input
            type="password"
            placeholder="hk_live_… or hk_test_…"
            value={credential}
            onChange={e => setCredential(e.target.value)}
            disabled={!!sessionId}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--hk-kiosk-border, rgba(255,255,255,0.08))',
              fontSize: 13,
              fontFamily: 'var(--hk-kiosk-mono, monospace)',
              background: 'var(--hk-kiosk-input-bg, rgba(24,24,27,0.8))',
              color: '#e4e4e7',
              boxSizing: 'border-box',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#a855f7'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>

        {/* Session control */}
        <div>
          <Label>Session</Label>
          {!sessionId ? (
            <button
              onClick={openSession}
              disabled={loading || !credential.trim()}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#9333ea',
                color: 'white',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'var(--hk-kiosk-mono, monospace)',
                cursor: loading || !credential.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !credential.trim() ? 0.5 : 1,
              }}
            >
              {loading ? 'Opening…' : 'Open session'}
            </button>
          ) : (
            <button
              onClick={endSession}
              disabled={loading}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid var(--hk-kiosk-border, rgba(255,255,255,0.08))',
                background: 'transparent',
                color: '#e4e4e7',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'var(--hk-kiosk-mono, monospace)',
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
          borderRadius: 999,
          background: '#3f3f46',
          color: '#e4e4e7',
          fontSize: 12,
          fontFamily: 'var(--hk-kiosk-mono, monospace)',
          marginBottom: 12,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c084fc', display: 'inline-block' }} />
          {sessionId}
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(127, 29, 29, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: 12,
          fontFamily: 'var(--hk-kiosk-mono, monospace)',
          marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* ── Chat + raw panels ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>

        {/* Chat */}
        <div className="hk-kiosk-glass" style={{
          flex: '1 1 320px',
          border: '1px solid var(--hk-kiosk-border-soft, rgba(255,255,255,0.05))',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 320,
        }}>
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--hk-kiosk-border-soft, rgba(255,255,255,0.05))',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--hk-kiosk-text-dim, #a1a1aa)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontFamily: 'var(--hk-kiosk-mono, monospace)',
          }}>
            Conversation
          </div>
          <div style={{ flex: 1, padding: 12, overflowY: 'auto', minHeight: 200 }}>
            {messages.length === 0 && (
              <p style={{
                color: 'var(--hk-kiosk-text-faint, #52525b)',
                fontSize: 12,
                fontFamily: 'var(--hk-kiosk-mono, monospace)',
                margin: 0,
                textAlign: 'center',
                paddingTop: 32,
              }}>
                — open a session and send your first message —
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
            borderTop: '1px solid var(--hk-kiosk-border-soft, rgba(255,255,255,0.05))',
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
                borderRadius: 8,
                border: '1px solid var(--hk-kiosk-border, rgba(255,255,255,0.08))',
                fontSize: 13,
                fontFamily: 'var(--hk-kiosk-mono, monospace)',
                background: 'var(--hk-kiosk-input-bg, rgba(24,24,27,0.8))',
                color: '#e4e4e7',
              }}
              onFocus={e => e.target.style.borderColor = '#a855f7'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button
              onClick={handleSubmit}
              disabled={!sessionId || loading || !input.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#9333ea',
                color: 'white',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'var(--hk-kiosk-mono, monospace)',
                cursor: (!sessionId || loading || !input.trim()) ? 'not-allowed' : 'pointer',
                opacity: (!sessionId || loading || !input.trim()) ? 0.4 : 1,
                alignSelf: 'flex-end',
              }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Raw panels */}
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Panel title="Request">
            {rawRequest}
          </Panel>
          <Panel title="Response">
            {rawResponse}
          </Panel>
        </div>
      </div>
      </div>
    </div>
  );
}
