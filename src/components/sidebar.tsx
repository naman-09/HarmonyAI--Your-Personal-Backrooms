'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  PanelLeftClose, PanelLeftOpen, Plus, MoreHorizontal, Pin, PinOff, Trash2,
  Pencil, Check, X, Home, TrendingUp, BookOpen, Sparkles, Settings as SettingsIcon,
  Shield, LogOut, Sun, Moon, RotateCw, MapPinOff,
} from 'lucide-react';
import { ClientStyle } from '@/components/client-style';
import { useTheme } from '@/components/theme-provider';
import { TimeOfDayIcon } from '@/components/time-of-day-icon';
import { useUserContext, describeTimeOfDay } from '@/hooks/use-user-context';

interface Session {
  sessionId: string;
  title:     string | null;
  pinned:    boolean;
  createdAt: string;
  endedAt:   string | null;
  riskLevel: string;
}

interface SidebarProps {
  /** Whether the current user is an admin (shows the Crisis log link). */
  isAdmin?: boolean;
}

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Home',      icon: Home },
  { href: '/progress',   label: 'Progress',  icon: TrendingUp },
  { href: '/journal',    label: 'Journal',   icon: BookOpen },
  { href: '/resources',  label: 'Resources', icon: Sparkles },
  { href: '/settings',   label: 'Settings',  icon: SettingsIcon },
] as const;

const COLLAPSE_KEY = 'harmony-sidebar-collapsed';

export function Sidebar({ isAdmin }: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
  const userCtx = useUserContext();

  const [collapsed,   setCollapsed]   = useState(false);
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [menuFor,     setMenuFor]     = useState<string | null>(null);
  const [renamingId,  setRenamingId]  = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── Persisted collapsed state ───────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored === '1') setCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // ── Load chat list ──────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const r = await fetch('/api/sessions');
      const d = await r.json();
      setSessions(d.sessions ?? []);
    } catch { /* silent */ }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Refresh the list when navigation changes (e.g. after creating/deleting)
  useEffect(() => { loadSessions(); }, [pathname, loadSessions]);

  // ── Close menu on outside click / Esc ──────────────────────
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setMenuFor(null); setRenamingId(null); }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────
  async function startNewChat() {
    setCreating(true);
    try {
      const r = await fetch('/api/sessions', { method: 'POST' });
      if (!r.ok) throw new Error();
      const { sessionId } = await r.json();
      router.push(`/chat/${sessionId}`);
    } catch {
      toast.error('Couldn\'t start a new chat');
      setCreating(false);
    }
  }

  async function togglePin(s: Session) {
    setMenuFor(null);
    const next = !s.pinned;
    // Optimistic update
    setSessions((prev) => sortSessions(prev.map((x) =>
      x.sessionId === s.sessionId ? { ...x, pinned: next } : x,
    )));
    try {
      const r = await fetch(`/api/sessions/${s.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: next }),
      });
      if (!r.ok) throw new Error();
      toast.success(next ? 'Pinned to top' : 'Unpinned');
    } catch {
      toast.error('Failed — try again');
      loadSessions();
    }
  }

  async function deleteChat(s: Session) {
    setMenuFor(null);
    if (!confirm(`Delete "${displayTitle(s)}"? This cannot be undone.`)) return;
    // Optimistic remove
    setSessions((prev) => prev.filter((x) => x.sessionId !== s.sessionId));
    try {
      const r = await fetch(`/api/sessions/${s.sessionId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      toast.success('Deleted');
      // If we were on that chat, bounce to dashboard
      if (pathname?.includes(s.sessionId)) router.push('/dashboard');
    } catch {
      toast.error('Failed to delete');
      loadSessions();
    }
  }

  function beginRename(s: Session) {
    setMenuFor(null);
    setRenamingId(s.sessionId);
    setRenameDraft(displayTitle(s));
  }

  async function commitRename(s: Session) {
    const title = renameDraft.trim().slice(0, 80);
    setRenamingId(null);
    if (!title || title === displayTitle(s)) return;
    setSessions((prev) => prev.map((x) =>
      x.sessionId === s.sessionId ? { ...x, title } : x,
    ));
    try {
      const r = await fetch(`/api/sessions/${s.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!r.ok) throw new Error();
    } catch {
      toast.error('Rename failed');
      loadSessions();
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  // ── Derived ────────────────────────────────────────────────
  const sortedSessions = useMemo(() => sortSessions(sessions), [sessions]);
  const pinned   = sortedSessions.filter((s) => s.pinned);
  const recent   = sortedSessions.filter((s) => !s.pinned);

  // ── Render ─────────────────────────────────────────────────
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Top: brand + collapse toggle ── */}
      <div className="sidebar-top">
        {!collapsed && (
          <button
            onClick={() => router.push('/dashboard')}
            className="brand"
            title="Harmony home"
          >
            <span className="brand-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <g fill="var(--color-primary)">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <rect
                      key={i}
                      x="11" y="2" width="2" height="6" rx="1"
                      transform={`rotate(${i * 45} 12 12)`}
                      opacity={0.5 + (i % 3) * 0.18}
                    />
                  ))}
                </g>
                <circle cx="12" cy="12" r="3" fill="var(--color-primary)" />
              </svg>
            </span>
            <span className="brand-name">Harmony</span>
          </button>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="collapse-toggle"
          title={collapsed ? 'Open sidebar (Ctrl+.)' : 'Close sidebar (Ctrl+.)'}
          aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* ── New chat ── */}
      <button
        onClick={startNewChat}
        disabled={creating}
        className="new-chat-btn"
        title="Start a new conversation"
      >
        <Plus size={16} strokeWidth={2.4} />
        {!collapsed && <span>{creating ? 'Starting…' : 'New conversation'}</span>}
      </button>

      {/* ── Nav links ── */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon   = item.icon;
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`nav-item ${active ? 'nav-item-active' : ''}`}
              title={item.label}
            >
              <Icon size={16} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className={`nav-item nav-item-admin ${pathname === '/admin' ? 'nav-item-active' : ''}`}
            title="Crisis log"
          >
            <Shield size={16} />
            {!collapsed && <span>Crisis log</span>}
          </button>
        )}
      </nav>

      {/* ── Chats ── */}
      {!collapsed && (
        <div className="chats-section" ref={menuRef}>
          {pinned.length > 0 && (
            <>
              <p className="chats-eyebrow">Pinned</p>
              <div className="chats-list">
                {pinned.map((s) => (
                  <ChatRow
                    key={s.sessionId} s={s}
                    active={pathname?.includes(s.sessionId) ?? false}
                    menuOpen={menuFor === s.sessionId}
                    renaming={renamingId === s.sessionId}
                    renameDraft={renameDraft}
                    setRenameDraft={setRenameDraft}
                    onOpen={() => router.push(`/chat/${s.sessionId}`)}
                    onMenu={() => setMenuFor(menuFor === s.sessionId ? null : s.sessionId)}
                    onPin={() => togglePin(s)}
                    onRename={() => beginRename(s)}
                    onCommitRename={() => commitRename(s)}
                    onCancelRename={() => setRenamingId(null)}
                    onDelete={() => deleteChat(s)}
                  />
                ))}
              </div>
            </>
          )}

          <p className="chats-eyebrow" style={{ marginTop: pinned.length > 0 ? 12 : 0 }}>
            Recent
          </p>
          {loadingList ? (
            <div className="chats-loading">
              {[1, 2, 3].map((i) => <div key={i} className="chat-skel" />)}
            </div>
          ) : recent.length === 0 ? (
            <p className="chats-empty">
              {pinned.length > 0 ? 'No other chats yet.' : 'Start your first conversation ↑'}
            </p>
          ) : (
            <div className="chats-list">
              {recent.map((s) => (
                <ChatRow
                  key={s.sessionId} s={s}
                  active={pathname?.includes(s.sessionId) ?? false}
                  menuOpen={menuFor === s.sessionId}
                  renaming={renamingId === s.sessionId}
                  renameDraft={renameDraft}
                  setRenameDraft={setRenameDraft}
                  onOpen={() => router.push(`/chat/${s.sessionId}`)}
                  onMenu={() => setMenuFor(menuFor === s.sessionId ? null : s.sessionId)}
                  onPin={() => togglePin(s)}
                  onRename={() => beginRename(s)}
                  onCommitRename={() => commitRename(s)}
                  onCancelRename={() => setRenamingId(null)}
                  onDelete={() => deleteChat(s)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── "Right now" panel — local time + weather + city ── */}
      {!collapsed && (
        <NowPanel
          loading={userCtx.loading}
          weather={userCtx.weather}
          tod={userCtx.timeOfDay}
          error={userCtx.error}
          onRefresh={() => userCtx.refresh()}
        />
      )}
      {collapsed && userCtx.weather && (
        <div className="now-panel-mini" title={`${userCtx.weather.description} · ${userCtx.weather.temperatureC}°`}>
          <TimeOfDayIcon tod={userCtx.timeOfDay} size={24} />
        </div>
      )}

      {/* ── Bottom: theme + logout ── */}
      <div className="sidebar-bottom">
        <button
          onClick={toggleTheme}
          className="bottom-btn"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button onClick={logout} className="bottom-btn" title="Sign out">
          <LogOut size={15} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* ── Styles ─────────────────────────────────────────── */}
      <ClientStyle>{`
        .sidebar {
          width: 260px;
          flex-shrink: 0;
          display: flex; flex-direction: column;
          height: 100dvh;
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: sticky; top: 0;
          z-index: 20;
        }
        .sidebar-collapsed {
          width: 60px;
        }
        .sidebar-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 14px 10px;
          gap: 8px;
        }
        .brand {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none;
          color: var(--color-text);
          cursor: pointer;
          font-family: inherit;
          padding: 0;
        }
        .brand-icon {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px;
          animation: brandSpin 24s linear infinite;
        }
        .brand-name {
          font-size: 16px;
          font-weight: 500;
          letter-spacing: -0.01em;
          font-family: var(--font-serif);
        }
        .collapse-toggle {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: none;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--color-muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        .collapse-toggle:hover {
          background: var(--color-bg);
          color: var(--color-text);
          border-color: var(--color-border);
        }

        .new-chat-btn {
          margin: 4px 10px 12px;
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          background: color-mix(in srgb, var(--color-primary) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
          border-radius: var(--radius-md);
          color: var(--color-primary);
          font-size: 13.5px; font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }
        .new-chat-btn:hover:not(:disabled) {
          background: color-mix(in srgb, var(--color-primary) 18%, transparent);
        }
        .new-chat-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .sidebar-collapsed .new-chat-btn { justify-content: center; }

        .sidebar-nav {
          display: flex; flex-direction: column; gap: 2px;
          padding: 0 8px;
          margin-bottom: 12px;
        }
        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px;
          background: none;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--color-muted);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          transition: all 0.12s;
        }
        .nav-item:hover {
          background: var(--color-bg);
          color: var(--color-text);
        }
        .nav-item-active {
          background: color-mix(in srgb, var(--color-primary) 10%, transparent);
          color: var(--color-primary);
          font-weight: 500;
        }
        .nav-item-admin {
          color: var(--color-warning);
        }
        .sidebar-collapsed .nav-item { justify-content: center; padding: 8px 0; }

        .chats-section {
          flex: 1;
          overflow-y: auto;
          padding: 8px 8px 12px;
          border-top: 1px solid var(--color-border);
        }
        .chats-eyebrow {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-subtle);
          margin: 4px 8px 6px;
        }
        .chats-list {
          display: flex; flex-direction: column; gap: 1px;
        }
        .chats-empty {
          font-size: 12px;
          color: var(--color-subtle);
          padding: 8px 12px;
          margin: 0;
        }
        .chats-loading {
          display: flex; flex-direction: column; gap: 4px;
          padding: 0 4px;
        }
        .chat-skel {
          height: 28px;
          background: var(--color-bg);
          border-radius: var(--radius-sm);
          animation: shimmer 1.5s ease-in-out infinite;
        }

        /* ── "Right now" panel ── */
        .now-panel {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          margin: 0 8px;
          background: var(--weather-tint-strong, var(--color-surface-2));
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          transition: background 1.2s ease;
        }
        .now-icon { flex-shrink: 0; line-height: 0; }
        .now-text { flex: 1; min-width: 0; }
        .now-time {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
          display: flex; align-items: center; gap: 5px;
        }
        .now-dot { opacity: 0.4; }
        .now-temp { color: var(--color-primary); font-weight: 700; }
        .now-place {
          font-size: 11px;
          color: var(--color-muted);
          margin: 1px 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .now-panel-mini {
          display: flex; align-items: center; justify-content: center;
          padding: 8px 0;
          margin: 0 8px;
        }
        .now-refresh {
          width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          background: none;
          border: 1px solid transparent;
          border-radius: 50%;
          color: var(--color-muted);
          cursor: pointer;
          opacity: 0;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .now-panel:hover .now-refresh { opacity: 0.7; }
        .now-refresh:hover { opacity: 1; color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border)); }
        .now-refresh:disabled { opacity: 0.5; cursor: progress; }
        .spinning { animation: nowSpin 0.9s linear infinite; }
        @keyframes nowSpin { to { transform: rotate(360deg); } }

        /* Prompt variant — when user hasn't enabled location */
        .now-panel-prompt {
          width: calc(100% - 16px);
          border: 1px dashed var(--color-border-2);
          color: var(--color-muted);
          cursor: pointer;
          font-family: inherit;
          text-align: left;
        }
        .now-panel-prompt:hover {
          border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border-2));
          color: var(--color-text);
          background: color-mix(in srgb, var(--color-primary) 5%, transparent);
        }

        .sidebar-bottom {
          padding: 8px;
          border-top: 1px solid var(--color-border);
          margin-top: 8px;
          display: flex; flex-direction: column; gap: 1px;
        }
        .bottom-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px;
          background: none; border: none;
          border-radius: var(--radius-sm);
          color: var(--color-muted);
          font-size: 12.5px;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          transition: all 0.12s;
        }
        .bottom-btn:hover { background: var(--color-bg); color: var(--color-text); }
        .sidebar-collapsed .bottom-btn { justify-content: center; padding: 8px 0; }

        /* Scrollbar — thin, inherits theme */
        .chats-section::-webkit-scrollbar { width: 6px; }
        .chats-section::-webkit-scrollbar-track { background: transparent; }
        .chats-section::-webkit-scrollbar-thumb {
          background: var(--color-border-2);
          border-radius: 3px;
        }
        .chats-section::-webkit-scrollbar-thumb:hover {
          background: var(--color-muted);
        }

        @keyframes brandSpin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.85; } }

        /* Mobile: hide sidebar by default. The chat already adapts via media queries. */
        @media (max-width: 900px) {
          .sidebar {
            position: fixed;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          .sidebar.sidebar-open {
            transform: translateX(0);
          }
        }
      `}</ClientStyle>
    </aside>
  );
}

// ─── Chat row sub-component ────────────────────────────────────
interface ChatRowProps {
  s:              Session;
  active:         boolean;
  menuOpen:       boolean;
  renaming:       boolean;
  renameDraft:    string;
  setRenameDraft: (v: string) => void;
  onOpen:         () => void;
  onMenu:         () => void;
  onPin:          () => void;
  onRename:       () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDelete:       () => void;
}

function ChatRow({
  s, active, menuOpen, renaming, renameDraft, setRenameDraft,
  onOpen, onMenu, onPin, onRename, onCommitRename, onCancelRename, onDelete,
}: ChatRowProps) {
  return (
    <div className={`chat-row ${active ? 'chat-row-active' : ''}`}>
      {renaming ? (
        <div className="chat-rename">
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value.slice(0, 80))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            onBlur={onCommitRename}
            className="chat-rename-input"
            maxLength={80}
          />
          <button onClick={onCommitRename} className="chat-rename-btn" title="Save">
            <Check size={13} />
          </button>
          <button onClick={onCancelRename} className="chat-rename-btn" title="Cancel">
            <X size={13} />
          </button>
        </div>
      ) : (
        <>
          <button onClick={onOpen} className="chat-link" title={displayTitle(s)}>
            {s.pinned && <Pin size={11} className="chat-pin-mark" />}
            <span className="chat-title">{displayTitle(s)}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMenu(); }}
            className={`chat-menu-trigger ${menuOpen ? 'chat-menu-trigger-on' : ''}`}
            title="More"
            aria-label="More options"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="chat-menu" role="menu">
              <button onClick={onRename} role="menuitem">
                <Pencil size={13} /> Rename
              </button>
              <button onClick={onPin} role="menuitem">
                {s.pinned ? <><PinOff size={13} /> Unpin</> : <><Pin size={13} /> Pin</>}
              </button>
              <button onClick={onDelete} role="menuitem" className="menu-item-danger">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </>
      )}

      <ClientStyle>{`
        .chat-row {
          position: relative;
          display: flex; align-items: stretch;
          border-radius: var(--radius-sm);
        }
        .chat-row:hover {
          background: var(--color-bg);
        }
        .chat-row-active {
          background: color-mix(in srgb, var(--color-primary) 10%, transparent);
        }
        .chat-row-active:hover {
          background: color-mix(in srgb, var(--color-primary) 14%, transparent);
        }
        .chat-link {
          flex: 1;
          display: flex; align-items: center; gap: 6px;
          padding: 7px 10px 7px 12px;
          background: none; border: none;
          color: var(--color-text);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          min-width: 0;
        }
        .chat-row-active .chat-link { color: var(--color-primary); font-weight: 500; }
        .chat-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chat-pin-mark {
          color: var(--color-primary);
          flex-shrink: 0;
        }
        .chat-menu-trigger {
          width: 26px;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none;
          color: var(--color-muted);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.12s, color 0.12s;
          border-radius: var(--radius-sm);
        }
        .chat-row:hover .chat-menu-trigger,
        .chat-menu-trigger-on {
          opacity: 1;
        }
        .chat-menu-trigger:hover { color: var(--color-text); }
        .chat-menu-trigger-on { background: var(--color-surface); color: var(--color-text); }

        .chat-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          min-width: 132px;
          padding: 4px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: 0 6px 24px rgba(0,0,0,0.18);
          z-index: 30;
          display: flex; flex-direction: column;
          animation: menuFade 0.12s ease-out;
        }
        .chat-menu button {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px;
          font-size: 12.5px;
          background: none; border: none;
          border-radius: var(--radius-sm);
          color: var(--color-text);
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }
        .chat-menu button:hover { background: var(--color-bg); }
        .menu-item-danger { color: #ef4444 !important; }
        .menu-item-danger:hover {
          background: color-mix(in srgb, #ef4444 10%, transparent) !important;
        }

        .chat-rename {
          flex: 1;
          display: flex; align-items: center; gap: 4px;
          padding: 4px 6px 4px 12px;
        }
        .chat-rename-input {
          flex: 1; min-width: 0;
          padding: 4px 6px;
          background: var(--color-bg);
          border: 1px solid var(--color-primary);
          border-radius: var(--radius-sm);
          color: var(--color-text);
          font-size: 12.5px;
          font-family: inherit;
          outline: none;
        }
        .chat-rename-btn {
          width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none;
          color: var(--color-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
        }
        .chat-rename-btn:hover { background: var(--color-bg); color: var(--color-text); }

        @keyframes menuFade {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</ClientStyle>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────
function displayTitle(s: Session): string {
  if (s.title) return s.title;
  const d = new Date(s.createdAt);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
         ' · ' +
         d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function sortSessions(list: Session[]): Session[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// ─── "Right now" panel ───────────────────────────────────────
// Distinct states:
//   1. Permission not yet asked        → no panel (avoids clutter)
//   2. Loading the location/weather    → "Locating…" + spinner
//   3. Weather + city resolved (happy) → full readout
//   4. Weather resolved, city missing  → "Location pending" + refresh
//   5. Error / permission denied       → friendly message + refresh
function NowPanel({
  loading, weather, tod, error, onRefresh,
}: {
  loading: boolean;
  weather: ReturnType<typeof useUserContext>['weather'];
  tod:     ReturnType<typeof useUserContext>['timeOfDay'];
  error:   string | null;
  onRefresh: () => void | Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }

  // No weather, not loading, no error → user hasn't granted location yet.
  // Show a compact prompt rather than hiding entirely.
  if (!weather && !loading && !error) {
    return (
      <button onClick={handleRefresh} className="now-panel now-panel-prompt">
        <div className="now-icon">
          <TimeOfDayIcon tod={tod} size={28} />
        </div>
        <div className="now-text">
          <p className="now-time">{describeTimeOfDay(tod)}</p>
          <p className="now-place">Tap to enable location</p>
        </div>
      </button>
    );
  }

  const hasCity = !!weather?.locationName;

  return (
    <div className="now-panel">
      <div className="now-icon">
        <TimeOfDayIcon tod={tod} size={34} />
      </div>
      <div className="now-text">
        <p className="now-time">
          {describeTimeOfDay(tod)}
          <span className="now-dot">·</span>
          <span className="now-temp">
            {weather ? `${weather.temperatureC}°` : '—'}
          </span>
        </p>
        <p className="now-place" title={weather?.description}>
          {loading && !weather
            ? 'Locating…'
            : hasCity
              ? weather!.locationName
              : error
                ? <><MapPinOff size={10} style={{ display: 'inline', marginRight: 3 }} /> Location unavailable</>
                : 'Location pending'}
        </p>
      </div>
      <button
        onClick={handleRefresh}
        className="now-refresh"
        title={refreshing ? 'Refreshing…' : 'Refresh weather + location'}
        aria-label="Refresh"
        disabled={refreshing}
      >
        <RotateCw size={11} className={refreshing ? 'spinning' : ''} />
      </button>
    </div>
  );
}
