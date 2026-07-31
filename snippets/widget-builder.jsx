// Note: the live-preview component below is a deliberate duplicate of
// snippets/widget-preview.jsx, not an import — Mintlify snippets don't
// support nested snippet-to-snippet imports (only a parent .mdx file can
// import a snippet), and passing WidgetPreview down as a prop from
// widget-builder.mdx doesn't work either: the component reference doesn't
// survive the server/client boundary and silently comes through as
// undefined. Duplication is the same pattern already used for Noctylis/Label
// across playground-text.jsx and playground-voice.jsx. Keep this in sync
// with widget-preview.jsx by hand if either changes.

// ── Source of truth ──────────────────────────────────────────────────────────
// Defaults copied from kiosk-js/src/widget/widget.ts's constructor (the
// InternalConfig normalisation block) — not from customisation.mdx, which
// documents a theme-object surface the widget doesn't actually implement.
// Keeping this list in sync with widget.ts is what keeps the generated code
// honest: a field only appears in the emitted snippet when it differs from
// what the widget already defaults to.
export const DEFAULTS = {
  mode: 'live',
  position: 'bottom-right',
  theme: 'auto',
  primaryColor: '#0E50BD',
  title: 'Kiosk',
  placeholder: 'Type a message…',
  zIndex: 9999,
  showDisclosure: true,
};

// ── Design tokens ─────────────────────────────────────────────────────────
// The widget's own blue brand palette (light mode), from customisation.mdx —
// deliberately not the dark violet --hk-kiosk-* tokens the kiosk playgrounds
// use. This builder configures the website widget, a different product
// surface from the kiosk terminal demo.
export const T = {
  primary: '#0E50BD',
  primaryHover: '#0a3d8f',
  bg: '#ffffff',
  surface: '#f9fafb',
  border: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  radius: '12px',
};

// ── Live preview (duplicated from widget-preview.jsx — see note above) ──────

export const LIGHT_PALETTE = {
  bg: '#ffffff', surface: '#f3f4f6', border: '#e5e7eb',
  text: '#111827', textMuted: '#9ca3af',
};
export const DARK_PALETTE = {
  bg: '#1e1e2e', surface: '#2a2a3e', border: '#3a3a50',
  text: '#e8e8f0', textMuted: '#9999b0',
};

export function PreviewWidget({
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

export function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        color: T.text,
        marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: T.textMuted, lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        fontSize: 13,
        color: T.text,
        background: T.bg,
        boxSizing: 'border-box',
        outline: 'none',
        fontFamily: 'inherit',
      }}
      onFocus={e => e.target.style.borderColor = T.primary}
      onBlur={e => e.target.style.borderColor = T.border}
    />
  );
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 7,
            border: `1px solid ${value === opt.value ? T.primary : T.border}`,
            background: value === opt.value ? T.primary : T.bg,
            color: value === opt.value ? '#ffffff' : T.text,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.text }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: T.primary, cursor: 'pointer' }}
      />
      {label}
    </label>
  );
}

// ── Code generation ─────────────────────────────────────────────────────────
// Reads straight from `state`; only emits a key when it differs from
// DEFAULTS (or, for languageSelector/preferredLanguage/initialMessage, when
// non-empty — those have no default value at all). Matches
// drop-in-widget.mdx's formatting exactly: double-quoted string values,
// unquoted keys, trailing commas, no semicolons.

export function buildConfigObject(state) {
  const cfg = { credential: 'hk_live_your_credential_here' };
  if (state.mode !== DEFAULTS.mode) cfg.mode = state.mode;
  if (state.position !== DEFAULTS.position) cfg.position = state.position;
  if (state.theme !== DEFAULTS.theme) cfg.theme = state.theme;
  if (state.primaryColor !== DEFAULTS.primaryColor) cfg.primaryColor = state.primaryColor;
  if (state.title.trim() && state.title !== DEFAULTS.title) cfg.title = state.title;
  if (state.placeholder.trim() && state.placeholder !== DEFAULTS.placeholder) cfg.placeholder = state.placeholder;
  if (state.initialMessage.trim()) cfg.initialMessage = state.initialMessage.trim();
  if (state.zIndex !== DEFAULTS.zIndex) cfg.zIndex = state.zIndex;
  if (state.preferredLanguage.trim()) cfg.preferredLanguage = state.preferredLanguage.trim();
  if (state.languageSelectorEnabled && state.languages.length > 0) {
    cfg.languageSelector = {
      enabled: true,
      languages: state.languages.map(l => ({ code: l.code, label: l.label })),
    };
  }
  if (state.showDisclosure !== DEFAULTS.showDisclosure) cfg.showDisclosure = state.showDisclosure;
  return cfg;
}

export function serializeValue(v, indent) {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const items = v.map(item => `${indent}  ${serializeValue(item, indent + '  ')},`).join('\n');
    return `[\n${items}\n${indent}]`;
  }
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return '{}';
    const lines = keys.map(k => `${indent}  ${k}: ${serializeValue(v[k], indent + '  ')},`).join('\n');
    return `{\n${lines}\n${indent}}`;
  }
  return String(v);
}

export function buildCdnSnippet(state) {
  const obj = serializeValue(buildConfigObject(state), '  ');
  return `<script src="https://cdn.humain.ai/widget.js"></script>\n<script>\n  HumainWidget.init(${obj})\n</script>`;
}

export function buildNpmSnippet(state) {
  const obj = serializeValue(buildConfigObject(state), '');
  return `import { HumainWidget } from "@humain/kiosk-js/widget"\n\nHumainWidget.init(${obj})`;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function WidgetBuilder() {
  const [mode, setMode] = useState(DEFAULTS.mode);
  const [position, setPosition] = useState(DEFAULTS.position);
  const [theme, setTheme] = useState(DEFAULTS.theme);
  const [primaryColor, setPrimaryColor] = useState(DEFAULTS.primaryColor);
  const [title, setTitle] = useState(DEFAULTS.title);
  const [placeholder, setPlaceholder] = useState(DEFAULTS.placeholder);
  const [initialMessage, setInitialMessage] = useState('');
  const [zIndex, setZIndex] = useState(DEFAULTS.zIndex);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [languageSelectorEnabled, setLanguageSelectorEnabled] = useState(false);
  const [languages, setLanguages] = useState([{ code: 'en', label: 'English' }]);
  const [showDisclosure, setShowDisclosure] = useState(DEFAULTS.showDisclosure);
  const [preferredLanguage, setPreferredLanguage] = useState('');

  const [codeTab, setCodeTab] = useState('cdn');
  const [copied, setCopied] = useState(false);

  const state = {
    mode, position, theme, primaryColor, title, placeholder, initialMessage, zIndex,
    languageSelectorEnabled, languages, showDisclosure, preferredLanguage,
  };

  const previewProps = {
    position,
    theme,
    primaryColor,
    title: title.trim() || DEFAULTS.title,
    placeholder: placeholder.trim() || DEFAULTS.placeholder,
    initialMessage: initialMessage.trim() || undefined,
    zIndex,
    showDisclosure,
    languageSelector: languageSelectorEnabled && languages.length > 0
      ? { enabled: true, languages }
      : undefined,
  };

  const snippet = codeTab === 'cdn' ? buildCdnSnippet(state) : buildNpmSnippet(state);

  const copy = () => {
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const updateLanguage = (i, field, value) => {
    setLanguages(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };
  const addLanguage = () => setLanguages(prev => [...prev, { code: '', label: '' }]);
  const removeLanguage = (i) => setLanguages(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div style={{
      display: 'flex',
      gap: 24,
      flexWrap: 'wrap',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    }}>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div style={{
        flex: '1 1 340px',
        minWidth: 300,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 20,
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: T.text }}>
          Quick options
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: T.textMuted }}>
          Every change updates the preview on the right immediately.
        </p>

        <Field
          label="Device credential"
          hint="For display only — the generated code always shows a placeholder. Paste your real credential when you install it."
        >
          <TextInput type="password" value="" onChange={() => {}} placeholder="hk_live_…" />
        </Field>

        <Field label="Environment">
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[{ value: 'live', label: 'Live' }, { value: 'sandbox', label: 'Sandbox' }]}
          />
        </Field>

        <Field label="Position">
          <SegmentedControl
            value={position}
            onChange={setPosition}
            options={[{ value: 'bottom-right', label: 'Bottom right' }, { value: 'bottom-left', label: 'Bottom left' }]}
          />
        </Field>

        <Field label="Theme">
          <SegmentedControl
            value={theme}
            onChange={setTheme}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'auto', label: 'Auto' }]}
          />
        </Field>

        <Field label="Accent colour">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              style={{ width: 36, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, padding: 2, cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <TextInput value={primaryColor} onChange={setPrimaryColor} placeholder="#0E50BD" />
            </div>
          </div>
        </Field>

        <Field label="Header title">
          <TextInput value={title} onChange={setTitle} placeholder={DEFAULTS.title} />
        </Field>

        <Field label="Input placeholder">
          <TextInput value={placeholder} onChange={setPlaceholder} placeholder={DEFAULTS.placeholder} />
        </Field>

        <Field label="Initial message" hint="Shown automatically the first time a visitor opens the widget.">
          <TextInput value={initialMessage} onChange={setInitialMessage} placeholder="e.g. Hi! Ask me anything about our product." />
        </Field>

        <Field label="z-index">
          <input
            type="number"
            value={zIndex}
            onChange={e => setZIndex(Number(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              fontSize: 13,
              color: T.text,
              background: T.bg,
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </Field>

        {/* ── Advanced tier ────────────────────────────────────────────── */}
        <button
          onClick={() => setAdvancedOpen(o => !o)}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '10px 0',
            marginTop: 4,
            border: 'none',
            borderTop: `1px solid ${T.border}`,
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            color: T.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          Language &amp; disclosure
          <span style={{ transform: advancedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
        </button>

        {advancedOpen && (
          <div style={{ paddingTop: 8 }}>
            <Field label="AI disclosure banner">
              <Toggle
                checked={showDisclosure}
                onChange={setShowDisclosure}
                label="Show the AI disclosure banner (required by the EU AI Act for public deployments)"
              />
            </Field>

            <Field label="Preferred language" hint="BCP-47 code. Overrides browser language detection when no language selector is shown.">
              <TextInput value={preferredLanguage} onChange={setPreferredLanguage} placeholder="e.g. en, tr, de" />
            </Field>

            <Field label="Language selector">
              <Toggle
                checked={languageSelectorEnabled}
                onChange={setLanguageSelectorEnabled}
                label="Ask visitors to pick a language before the first message"
              />
            </Field>

            {languageSelectorEnabled && (
              <div style={{ marginBottom: 16 }}>
                {languages.map((l, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <div style={{ width: 70 }}>
                      <TextInput value={l.code} onChange={v => updateLanguage(i, 'code', v)} placeholder="en" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextInput value={l.label} onChange={v => updateLanguage(i, 'label', v)} placeholder="English" />
                    </div>
                    <button
                      onClick={() => removeLanguage(i)}
                      disabled={languages.length <= 1}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: languages.length <= 1 ? T.border : '#b91c1c',
                        cursor: languages.length <= 1 ? 'not-allowed' : 'pointer',
                        fontSize: 16,
                        lineHeight: 1,
                        padding: '4px 8px',
                      }}
                      title="Remove language"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={addLanguage}
                  style={{
                    marginTop: 4,
                    padding: '6px 12px',
                    borderRadius: 7,
                    border: `1px dashed ${T.border}`,
                    background: 'transparent',
                    color: T.primary,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Add language
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Preview + code ───────────────────────────────────────────────── */}
      <div style={{ flex: '1 1 380px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 20,
          minHeight: 480,
          position: 'relative',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: T.text }}>
            Live preview
          </h3>
          <PreviewWidget {...previewProps} />
        </div>

        <div style={{
          background: '#0b0f1a',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[{ id: 'cdn', label: 'CDN <script>' }, { id: 'npm', label: 'npm' }].map(t => (
                <button
                  key={t.id}
                  onClick={() => setCodeTab(t.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: codeTab === t.id ? T.primary : 'transparent',
                    color: codeTab === t.id ? '#ffffff' : '#9ca3af',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: '#e5e7eb',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre style={{
            margin: 0,
            padding: 16,
            fontSize: 12.5,
            lineHeight: 1.6,
            color: '#e5e7eb',
            overflowX: 'auto',
            fontFamily: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
          }}>
            {snippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
