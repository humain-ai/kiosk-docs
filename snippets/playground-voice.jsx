const { useState, useRef, useCallback, useEffect } = React;

export const ENVS = {
  sandbox: 'https://sandbox.api.humain.ai',
  live: 'https://api.humain.ai',
};

export const STATUSES = {
  idle:        { label: 'Idle',        dot: '',           color: '#9ca3af' },
  connecting:  { label: 'Connecting…', dot: 'connecting', color: '#f59e0b' },
  connected:   { label: 'Connected',   dot: 'listening',  color: '#10b981' },
  listening:   { label: 'Listening…',  dot: 'listening',  color: '#10b981' },
  processing:  { label: 'Processing…', dot: 'connecting', color: '#f59e0b' },
  speaking:    { label: 'Speaking…',   dot: 'speaking',   color: '#6366f1' },
  error:       { label: 'Error',       dot: '',           color: '#ef4444' },
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

export function StatusBar({ status, sessionId }) {
  const s = STATUSES[status] ?? STATUSES.idle;
  return (
    <div className="hk-status" style={{ marginBottom: 16 }}>
      <span className={`hk-status-dot ${s.dot}`} style={{ background: s.color }} />
      <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
      {sessionId && (
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginLeft: 8 }}>
          {sessionId.slice(0, 8)}…
        </span>
      )}
    </div>
  );
}

export default function PlaygroundVoice() {
  const [credential, setCredential] = useState('');
  const [env, setEnv] = useState('sandbox');
  const [status, setStatus] = useState('idle');
  const [sessionId, setSessionId] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [micAllowed, setMicAllowed] = useState(null); // null = unknown, true/false

  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const audioElRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const baseUrl = ENVS[env];
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
      const res = await fetch(`${baseUrl}/v1/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: 'voice' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error);
      const sid = data.session_id;
      setSessionId(sid);
      appendTranscript('system', `Session opened: ${sid}`);

      // 2. Get mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setMicAllowed(true);

      // 3. Create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
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

      // 5. Exchange offer/answer
      const offerRes = await fetch(`${baseUrl}/v1/sessions/${sid}/webrtc/offer`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sdp: offer.sdp }),
      });
      const { sdp: answerSDP } = await offerRes.json();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSDP });
      appendTranscript('system', 'WebRTC negotiation complete. Speak into your microphone.');

      // 6. Send ICE candidates
      pc.onicecandidate = async ({ candidate }) => {
        if (!candidate) return;
        await fetch(`${baseUrl}/v1/sessions/${sid}/webrtc/ice`, {
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
  }, [credential, baseUrl]);

  // ── Stop session ─────────────────────────────────────────────────────────

  const cleanup = useCallback(async (callEnd = true) => {
    if (callEnd && sessionId) {
      try {
        await fetch(`${baseUrl}/v1/sessions/${sessionId}/end`, {
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
    setStatus('idle');
    appendTranscript('system', 'Session ended.');
  }, [sessionId, baseUrl, credential]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => cleanup(!!sessionId);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const isActive = status !== 'idle' && status !== 'error';
  const btnClass = `hk-voice-btn${status === 'listening' ? ' listening' : ''}`;

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 260px' }}>
          <Label>Device credential</Label>
          <input
            type="password"
            placeholder="hk_live_…"
            value={credential}
            onChange={e => setCredential(e.target.value)}
            disabled={isActive}
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
        <div>
          <Label>Environment</Label>
          <div className="hk-mode-toggle">
            {['sandbox', 'live'].map(e => (
              <button
                key={e}
                className={env === e ? 'active' : ''}
                onClick={() => !isActive && setEnv(e)}
                disabled={isActive}
              >
                {e === 'sandbox' ? 'Sandbox' : 'Live'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 6,
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* ── Mic permission warning ────────────────────────────────────────── */}
      {micAllowed === false && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 6,
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          color: '#92400e',
          fontSize: 13,
          marginBottom: 16,
        }}>
          Microphone access is blocked. Allow microphone access in your browser settings and reload.
        </div>
      )}

      {/* ── Main voice area ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 32,
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 12,
        marginBottom: 16,
        background: 'var(--surface-muted, #fafafa)',
      }}>
        <StatusBar status={status} sessionId={sessionId} />

        <button
          className={btnClass}
          onClick={isActive ? () => cleanup(true) : start}
          disabled={status === 'connecting'}
          title={isActive ? 'End call' : 'Start voice session'}
        >
          {/* Mic icon (SVG) */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isActive ? (
              /* Stop icon when active */
              <rect x="6" y="6" width="12" height="12" rx="2" fill="white" />
            ) : (
              /* Mic icon when idle */
              <>
                <rect x="9" y="2" width="6" height="12" rx="3" fill="white" />
                <path d="M5 10a7 7 0 0014 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="17" x2="12" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="21" x2="16" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>

        <p style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--text-secondary, #6b7280)',
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
      {transcript.length > 0 && (
        <div>
          <Label>Session log</Label>
          <div style={{
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 8,
            maxHeight: 200,
            overflowY: 'auto',
            padding: 12,
            fontSize: 12,
            fontFamily: 'monospace',
            lineHeight: 1.6,
            background: 'var(--surface-muted, #f9fafb)',
          }}>
            {transcript.map(t => (
              <div key={t.id} style={{
                color: t.role === 'system'
                  ? 'var(--text-muted, #9ca3af)'
                  : 'var(--text-primary, #111827)',
              }}>
                <span style={{ fontWeight: 600 }}>
                  {t.role === 'system' ? '[system]' : t.role === 'user' ? '[user]' : '[ai]'}
                </span>{' '}{t.text}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
