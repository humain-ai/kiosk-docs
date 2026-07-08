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

// variant/pulse mirror kiosk-demo's StatusBadge STATUS_META exactly.
export const STATUSES = {
  idle:        { label: 'Idle',            variant: '',        pulse: false },
  connecting:  { label: 'Connecting…',     variant: '',        pulse: true },
  connected:   { label: 'AI Connecting…',  variant: '',        pulse: true },
  listening:   { label: 'Listening…',      variant: 'active',  pulse: true },
  processing:  { label: 'Reconnecting…',   variant: '',        pulse: true },
  speaking:    { label: 'AI Speaking',     variant: 'active',  pulse: true },
  error:       { label: 'Error',           variant: 'error',   pulse: false },
};

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

export function StatusBar({ status, sessionId }) {
  const s = STATUSES[status] ?? STATUSES.idle;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <span className={`hk-status ${s.variant}`}>
        <span className={`hk-status-dot ${s.pulse ? 'pulse' : ''}`} />
        {s.label}
      </span>
      {sessionId && (
        <span style={{ fontFamily: 'var(--hk-kiosk-mono, monospace)', fontSize: 11, color: 'var(--hk-kiosk-text-faint, #52525b)' }}>
          {sessionId.slice(0, 8)}…
        </span>
      )}
    </div>
  );
}

export default function PlaygroundVoice() {
  const [credential, setCredential] = useState('');
  const [status, setStatus] = useState('idle');
  const [sessionId, setSessionId] = useState(null);
  const [agentUrl, setAgentUrl] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [micAllowed, setMicAllowed] = useState(null); // null = unknown, true/false

  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const audioElRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const headers = { 'Authorization': `Bearer ${credential}`, 'Content-Type': 'application/json' };

  const appendTranscript = (role, text) => {
    setTranscript(prev => [...prev, { role, text, id: Date.now() }]);
    setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // ── Check mic permission ──────────────────────────────────────────────────

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    navigator.permissions?.query({ name: 'microphone' }).then(result => {
      setMicAllowed(result.state === 'granted');
      result.onchange = () => setMicAllowed(result.state === 'granted');
    }).catch(() => setMicAllowed(null));
  }, []);

  // ── Start session ────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (!credential.trim()) { setError('Paste a device credential first.'); return; }
    setError(null);
    setTranscript([]);
    setStatus('connecting');

    try {
      // 1. Open session
      const res = await fetch(`${API_BASE}/v1/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: 'voice' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error);
      const sid = data.session_id;
      // Every subsequent call (offer, ice, end) goes to agent_url, not API_BASE.
      const agentBase = data.agent_url || API_BASE;
      setSessionId(sid);
      setAgentUrl(agentBase);
      appendTranscript('system', `Session opened: ${sid}`);

      // 2. Get mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setMicAllowed(true);

      // 3. Create RTCPeerConnection — use ice_servers from the open response when present
      // (TURN configured for the workspace), otherwise fall back to public STUN.
      const pc = new RTCPeerConnection({
        iceServers: data.ice_servers?.length ? data.ice_servers : [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // Play remote audio (AI voice)
      pc.ontrack = (event) => {
        if (!audioElRef.current) {
          const audio = document.createElement('audio');
          audio.autoplay = true;
          document.body.appendChild(audio);
          audioElRef.current = audio;
        }
        audioElRef.current.srcObject = event.streams[0];
        setStatus('speaking');
      };

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case 'connected':    setStatus('listening'); break;
          case 'disconnected': setStatus('connecting'); break;
          case 'failed':
            setError('WebRTC connection failed. Check your network.');
            setStatus('error');
            break;
          case 'closed':
            setStatus('idle');
            break;
        }
      };

      // Add local audio track
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      // 4. Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 5. Exchange offer/answer (on agent_url)
      const offerRes = await fetch(`${agentBase}/v1/sessions/${sid}/webrtc/offer`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sdp: offer.sdp }),
      });
      const offerData = await offerRes.json();
      if (!offerRes.ok) throw new Error(`${offerData.error}: ${offerData.message}`);
      await pc.setRemoteDescription({ type: 'answer', sdp: offerData.sdp });
      appendTranscript('system', 'WebRTC negotiation complete. Speak into your microphone.');

      // 6. Send ICE candidates (on agent_url)
      pc.onicecandidate = async ({ candidate }) => {
        if (!candidate) return;
        await fetch(`${agentBase}/v1/sessions/${sid}/webrtc/ice`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            candidate:       candidate.candidate,
            sdp_mid:         candidate.sdpMid,
            sdp_mline_index: candidate.sdpMLineIndex,
          }),
        }).catch(() => {});
      };

    } catch (e) {
      setError(e.message);
      setStatus('error');
      cleanup(false);
    }
  }, [credential]);

  // ── Stop session ─────────────────────────────────────────────────────────

  const cleanup = useCallback(async (callEnd = true) => {
    if (callEnd && sessionId && agentUrl) {
      try {
        await fetch(`${agentUrl}/v1/sessions/${sessionId}/end`, {
          method: 'POST',
          headers,
        });
      } catch {}
    }

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }

    setSessionId(null);
    setAgentUrl(null);
    setStatus('idle');
    appendTranscript('system', 'Session ended.');
  }, [sessionId, agentUrl, credential]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => cleanup(!!sessionId);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const isActive = status !== 'idle' && status !== 'error';
  const btnClass = `hk-voice-btn${status === 'listening' ? ' listening' : ''}`;

  const ROLE_META = {
    system: { prefix: '⬡ system', color: 'var(--hk-kiosk-text-faint, #52525b)', italic: true },
    user:   { prefix: '▶ you',    color: '#f4f4f5', italic: false },
    ai:     { prefix: '◈ ai',     color: '#d8b4fe', italic: false },
  };

  return (
    <div className="hk-kiosk-panel">
      <Noctylis />
      <div style={{ position: 'relative', zIndex: 1, padding: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          fontFamily: 'var(--hk-kiosk-mono, monospace)',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          color: 'var(--hk-kiosk-text-muted, #71717a)',
          marginBottom: 10,
        }}>
          Humain Kiosk
        </div>
        <StatusBar status={status} sessionId={sessionId} />
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 420, margin: '0 auto 16px' }}>
        <Label>Device credential</Label>
        <input
          type="password"
          placeholder="hk_live_… or hk_test_…"
          value={credential}
          onChange={e => setCredential(e.target.value)}
          disabled={isActive}
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

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          maxWidth: 420,
          margin: '0 auto 16px',
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(127, 29, 29, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: 12,
          fontFamily: 'var(--hk-kiosk-mono, monospace)',
        }}>
          {error}
        </div>
      )}

      {/* ── Mic permission warning ────────────────────────────────────────── */}
      {micAllowed === false && (
        <div style={{
          maxWidth: 420,
          margin: '0 auto 16px',
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(120, 53, 15, 0.2)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#fbbf24',
          fontSize: 13,
        }}>
          Microphone access is blocked. Allow microphone access in your browser settings and reload.
        </div>
      )}

      {/* ── Main voice area ───────────────────────────────────────────────── */}
      <div className="hk-kiosk-glass" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '32px 24px',
        border: '1px solid var(--hk-kiosk-border-soft, rgba(255,255,255,0.05))',
        borderRadius: 14,
        marginBottom: 16,
      }}>
        <button
          className={btnClass}
          onClick={isActive ? () => cleanup(true) : start}
          disabled={status === 'connecting'}
          title={isActive ? 'End call' : 'Start voice session'}
        >
          {/* Mic icon (SVG) — colored via currentColor, driven by .hk-voice-btn state */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isActive ? (
              /* Stop icon when active */
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            ) : (
              /* Mic icon when idle */
              <>
                <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
                <path d="M5 10a7 7 0 0014 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>

        <p style={{
          margin: 0,
          fontSize: 12,
          fontFamily: 'var(--hk-kiosk-mono, monospace)',
          color: 'var(--hk-kiosk-text-muted, #71717a)',
          textAlign: 'center',
        }}>
          {!isActive
            ? 'Click to start a voice session. Microphone access required.'
            : status === 'connecting'
              ? 'Establishing connection…'
              : 'Click the button to end the call.'}
        </p>
      </div>

      {/* ── Transcript ────────────────────────────────────────────────────── */}
      <div className="hk-kiosk-glass" style={{
        border: '1px solid var(--hk-kiosk-border-soft, rgba(255,255,255,0.05))',
        borderRadius: 14,
        maxHeight: 208,
        overflowY: 'auto',
        padding: '12px 16px',
      }}>
        {transcript.length === 0 ? (
          <p style={{
            textAlign: 'center',
            fontFamily: 'var(--hk-kiosk-mono, monospace)',
            fontSize: 12,
            color: 'var(--hk-kiosk-text-faint, #52525b)',
            margin: 0,
          }}>
            — awaiting session —
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transcript.map(t => {
              const meta = ROLE_META[t.role] ?? ROLE_META.system;
              return (
                <div key={t.id} style={{
                  fontFamily: 'var(--hk-kiosk-mono, monospace)',
                  fontSize: 12,
                  lineHeight: 1.6,
                }}>
                  <span style={{ marginRight: 8, color: 'var(--hk-kiosk-text-faint, #52525b)' }}>
                    {meta.prefix}
                  </span>
                  <span style={{ color: meta.color, fontStyle: meta.italic ? 'italic' : 'normal' }}>
                    {t.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>
      </div>
    </div>
  );
}
