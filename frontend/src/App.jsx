import { useState, useEffect, useRef } from 'react';

const ADMIN_PASS = 'admin';

function App() {
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  const [tickets, setTickets] = useState(5);
  const [logs, setLogs] = useState([]);
  const [currentMode, setCurrentMode] = useState('race');
  const [warState, setWarState] = useState('idle'); // idle | countdown | open | closed
  const [countdown, setCountdown] = useState(0);

  const [buyResult, setBuyResult] = useState(null); // null | 'success' | 'failed'
  const [isBuying, setIsBuying] = useState(false);
  const [hasBought, setHasBought] = useState(false); // user already tried
  const [customTickets, setCustomTickets] = useState(5);
  const [isResetting, setIsResetting] = useState(false);

  const successContainerRef = useRef(null);
  const failedContainerRef = useRef(null);
  const API_URL = "https://d8de8bbf4f93eb.lhr.life/api";

  // Poll status from server
  useEffect(() => {
    const interval = setInterval(async () => { // Poll faster to prevent desync (250ms)
      try {
        const res = await fetch(`${API_URL}/status`);
        const data = await res.json();
        setTickets(data.tickets_available);
        setCurrentMode(data.current_mode);
        setWarState(data.war_state);
        setCountdown(Math.ceil(data.countdown_remaining));
        setLogs(data.logs);
      } catch (err) {
        console.error('Fetch error', err);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Reset hasBought when war goes back to idle (after reset)
  useEffect(() => {
    if (warState === 'idle') {
      setHasBought(false);
      setBuyResult(null);
    }
  }, [warState]);

  // Force scroll to top whenever logs change so newest data is ALWAYS visible
  useEffect(() => {
    if (successContainerRef.current) {
      successContainerRef.current.scrollTop = 0;
    }
    if (failedContainerRef.current) {
      failedContainerRef.current.scrollTop = 0;
    }
  }, [logs.length]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) setHasJoined(true);
  };

  const isAdmin = username.toLowerCase() === ADMIN_PASS;

  // ---- Admin Actions ----
  const changeMode = async (mode) => {
    await fetch(`${API_URL}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  };

  const resetSimulation = async () => {
    setIsResetting(true);
    try {
      await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ initial_tickets: parseInt(customTickets) || 5 }),
      });
      // Simulate slight delay so the animation is visible
      await new Promise(r => setTimeout(r, 600)); 
    } finally {
      setIsResetting(false);
    }
  };

  const startWar = async () => {
    await fetch(`${API_URL}/start`, { method: 'POST' });
  };

  // ---- User Action ----
  const buyTicket = async () => {
    if (isBuying || hasBought || warState !== 'open') return;
    setIsBuying(true);
    try {
      const res = await fetch(`${API_URL}/buy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: username }),
      });
      if (res.ok) {
        setBuyResult('success');
      } else {
        setBuyResult('failed');
      }
    } catch {
      setBuyResult('failed');
    }
    setHasBought(true);
    setIsBuying(false);
  };

  // ---- Join Screen ----
  if (!hasJoined) {
    return (
      <div className="dashboard" style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="header">
            <h2>Join Ticket War</h2>
            <p>Masukkan nama Anda untuk ikut simulasi</p>
          </div>
          <form onSubmit={handleJoin} className="input-group">
            <input
              type="text"
              placeholder="Nama / Panggilan..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              *Ketik "admin" untuk masuk sebagai Host Panel
            </p>
            <button type="submit" style={{ marginTop: '1rem' }}>
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- Admin Dashboard ----
  if (isAdmin) {
    return (
      <div className="dashboard">
        <div className="header">
          <h1>🛠️ Admin Control Panel</h1>
          <p style={{ color: 'var(--danger-color)' }}>Anda adalah Host</p>
        </div>

        {/* Left: Controls */}
        <div className="glass-card" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
          <h2>Pengaturan Simulasi</h2>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Sisa Tiket: <strong style={{ fontSize: '2rem', color: 'var(--text-main)' }}>{tickets}</strong>
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Status War:{' '}
              <strong style={{
                color: warState === 'open' ? 'var(--success-color)'
                  : warState === 'countdown' ? 'orange'
                    : 'var(--text-muted)'
              }}>
                {warState === 'idle' ? '⏸ Idle'
                  : warState === 'countdown' ? `⏳ Hitung Mundur... ${countdown}`
                    : warState === 'open' ? '🔥 WAR AKTIF!'
                      : '🏁 Selesai'}
              </strong>
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pilih Mode:</p>
            <div className="btn-group">
              <button className={currentMode === 'race' ? 'danger' : 'outline'} onClick={() => changeMode('race')}>
                🔴 Race Condition
              </button>
              <button className={currentMode === 'safe' ? 'success' : 'outline'} onClick={() => changeMode('safe')}>
                🟢 Safe Mode (Lock)
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Custom Jumlah Tiket:</p>
            <input
              type="number"
              min="1"
              value={customTickets}
              onChange={(e) => setCustomTickets(e.target.value)}
              placeholder="Jumlah Tiket..."
              style={{
                width: '100%',
                padding: '0.8rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.2)',
                color: 'white'
              }}
            />
          </div>

          <button
            onClick={startWar}
            disabled={warState === 'countdown' || warState === 'open'}
            style={{
              width: '100%',
              padding: '1.2rem',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #6366f1, #c084fc)',
            }}
          >
            🚀 Mulai War! (Hitung Mundur 5 Detik)
          </button>

          <button
            className="outline"
            onClick={resetSimulation}
            disabled={isResetting}
            style={{ 
              width: '100%', 
              borderColor: 'var(--danger-color)', 
              color: 'var(--danger-color)',
              opacity: isResetting ? 0.7 : 1
            }}
          >
            {isResetting ? '⏳ Sedang Mereset...' : '🔄 Reset Semua'}
          </button>
        </div>

        {/* Right: Live Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Success Logs */}
          <div className="glass-card" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
            <h2 style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ✅ Success Logs <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>({logs.filter(l => l.status === 'Success').length})</span>
            </h2>
            <div className="logs-container" ref={successContainerRef}>
              {logs.filter(l => l.status === 'Success').length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Belum ada yang berhasil...</p>
              ) : (
                logs.filter(l => l.status === 'Success').reverse().map((log) => (
                  <div key={`${log.user}-${log.time}`} className="log-item success">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="log-time">{new Date(log.time * 1000).toLocaleTimeString()}</span>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          background: log.mode === 'Race Condition' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: log.mode === 'Race Condition' ? '#fca5a5' : '#a7f3d0',
                          border: '1px solid currentColor',
                          opacity: 0.8
                        }}>
                          {log.mode}
                        </span>
                      </div>
                      <div className="log-message">
                        <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>{log.user}</span>
                        <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.4)' }}>➜</span>
                        <span>{log.message}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Failed Logs */}
          <div className="glass-card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <h2 style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ❌ Failed Logs <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>({logs.filter(l => l.status === 'Failed').length})</span>
            </h2>
            <div className="logs-container" ref={failedContainerRef}>
              {logs.filter(l => l.status === 'Failed').length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Belum ada yang gagal...</p>
              ) : (
                logs.filter(l => l.status === 'Failed').reverse().map((log) => (
                  <div key={`${log.user}-${log.time}`} className="log-item failed">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="log-time">{new Date(log.time * 1000).toLocaleTimeString()}</span>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          background: log.mode === 'Race Condition' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: log.mode === 'Race Condition' ? '#fca5a5' : '#a7f3d0',
                          border: '1px solid currentColor',
                          opacity: 0.8
                        }}>
                          {log.mode}
                        </span>
                      </div>
                      <div className="log-message">
                        <span style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>{log.user}</span>
                        <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.4)' }}>➜</span>
                        <span>{log.message}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- User Screen ----
  return (
    <div className="dashboard" style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
          Halo, <strong style={{ color: 'var(--primary-color)' }}>{username}</strong>!
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 2rem' }}>
          Sisa Tiket: <strong style={{ color: 'var(--text-main)' }}>{tickets}</strong>
        </p>

        {/* IDLE */}
        {warState === 'idle' && !hasBought && (
          <div>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
            <h2>Menunggu Admin...</h2>
            <p style={{ color: 'var(--text-muted)' }}>Admin akan segera memulai War Tiket. Bersiaplah!</p>
          </div>
        )}

        {/* COUNTDOWN */}
        {warState === 'countdown' && !hasBought && (
          <div>
            <h2 style={{ margin: '0 0 0.5rem' }}>Bersiaplah!</h2>
            <div style={{
              fontSize: '9rem',
              fontWeight: '900',
              lineHeight: 1,
              color: countdown <= 2 ? 'var(--danger-color)' : 'var(--text-main)',
              textShadow: `0 0 40px ${countdown <= 2 ? 'rgba(239,68,68,0.7)' : 'rgba(99,102,241,0.5)'}`,
              transition: 'all 0.3s ease',
              animation: 'pulse 0.5s ease infinite alternate',
            }}>
              {countdown}
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
              Mode: <strong style={{ color: currentMode === 'race' ? 'var(--danger-color)' : 'var(--success-color)' }}>
                {currentMode === 'race' ? 'Race Condition 🔴' : 'Safe Mode 🟢'}
              </strong>
            </p>
          </div>
        )}

        {/* WAR OPEN & NOT BOUGHT */}
        {warState === 'open' && !hasBought && (
          <div>
            <h2 style={{ color: 'var(--danger-color)', fontSize: '1.8rem' }}>🔥 WAR TIKET! 🔥</h2>
            <button
              onClick={buyTicket}
              disabled={isBuying}
              style={{
                width: '100%',
                padding: '2rem',
                fontSize: '2rem',
                fontWeight: '900',
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                boxShadow: '0 0 40px rgba(239,68,68,0.6)',
                animation: 'pulse 0.6s ease infinite alternate',
                marginTop: '1rem',
              }}
            >
              {isBuying ? '⏳ MEMPROSES...' : '🎟️ BELI TIKET!'}
            </button>
          </div>
        )}

        {/* RESULT: SUCCESS */}
        {hasBought && buyResult === 'success' && (
          <div>
            <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'slideIn 0.5s ease' }}>🎉</div>
            <h2 style={{ color: 'var(--success-color)', fontSize: '2rem' }}>BERHASIL!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Selamat! Anda mendapatkan tiket.</p>
          </div>
        )}

        {/* RESULT: FAILED */}
        {hasBought && buyResult === 'failed' && (
          <div>
            <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'slideIn 0.5s ease' }}>😭</div>
            <h2 style={{ color: 'var(--danger-color)', fontSize: '2rem' }}>YAH, KEHABISAN!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Tiket sudah habis. Lebih cepat lagi ya!</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}

export default App;
