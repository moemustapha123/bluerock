import { useState, useEffect } from "react";

const COLORS = {
  navy: "#0A1628",
  blue: "#1B4FD8",
  lightBlue: "#3B82F6",
  sky: "#E8F0FE",
  white: "#FFFFFF",
  slate: "#64748B",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  surface: "#F8FAFF",
  border: "#E2E8F0",
};

const FONT = "'DM Sans', sans-serif";
const DISPLAY = "'DM Serif Display', serif";

const style = (obj) => Object.entries(obj).map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${v}`).join(";");

// ─── AUTH ────────────────────────────────────────────────────────────────────
const OWNER_EMAILS = ["moemustapha123@hotmail.com", "khaled_elkhodeir@hotmail.com"];

const loadAccounts = () => { try { return JSON.parse(localStorage.getItem("br_accounts") || "[]"); } catch { return []; } };
const saveAccounts = (a) => localStorage.setItem("br_accounts", JSON.stringify(a));
const loadSession  = () => { try { return JSON.parse(localStorage.getItem("br_session") || "null"); } catch { return null; } };
const saveSession  = (s) => localStorage.setItem("br_session", JSON.stringify(s));
const clearSession = () => localStorage.removeItem("br_session");

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const PROPERTIES = [
  { id: 1, name: "Lakeview Suite", address: "142 Lakeshore Dr, Unit 4A", color: "#1B4FD8" },
  { id: 2, name: "Downtown Loft", address: "89 Main St, Suite 12", color: "#7C3AED" },
  { id: 3, name: "Garden Cottage", address: "33 Elmwood Ln", color: "#059669" },
];

const INITIAL_JOBS = [
  { id: 1, propertyId: 1, checkoutDate: "2026-04-19", checkinDate: "2026-04-20", status: "complete", arrivedAt: "10:02 AM", completedAt: "12:34 PM", photos: 4, cleaner: "Maria S." },
  { id: 2, propertyId: 2, checkoutDate: "2026-04-19", checkinDate: "2026-04-20", status: "in-progress", arrivedAt: "11:15 AM", completedAt: null, photos: 0, cleaner: "James T." },
  { id: 3, propertyId: 3, checkoutDate: "2026-04-20", checkinDate: "2026-04-21", status: "pending", arrivedAt: null, completedAt: null, photos: 0, cleaner: "Maria S." },
  { id: 4, propertyId: 1, checkoutDate: "2026-04-22", checkinDate: "2026-04-23", status: "pending", arrivedAt: null, completedAt: null, photos: 0, cleaner: "James T." },
];

const INVENTORY_FLAGS = [
  { id: 1, propertyId: 1, item: "Toilet Paper", flaggedAt: "Apr 19, 10:30 AM", status: "pending", cleaner: "Maria S." },
  { id: 2, propertyId: 1, item: "Coffee Pods", flaggedAt: "Apr 19, 10:32 AM", status: "ordered", cleaner: "Maria S." },
  { id: 3, propertyId: 2, item: "Hand Soap", flaggedAt: "Apr 19, 11:45 AM", status: "pending", cleaner: "James T." },
  { id: 4, propertyId: 3, item: "Shampoo", flaggedAt: "Apr 18, 2:10 PM", status: "restocked", cleaner: "Maria S." },
];

const CHECKLIST_ITEMS = ["Toilet paper","Paper towels","Dish soap","Hand soap","Shampoo","Conditioner","Trash bags","Laundry pods","Coffee pods","Sponges","Dryer sheets","Bath towels","Kitchen towels"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const statusConfig = {
  pending:       { label: "Pending",     bg: "#FEF3C7", color: "#D97706", dot: "#F59E0B" },
  "in-progress": { label: "In Progress", bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6" },
  complete:      { label: "Complete",    bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
};

const invConfig = {
  pending:   { label: "Needs Order", bg: "#FEE2E2", color: "#991B1B" },
  ordered:   { label: "Ordered",     bg: "#FEF3C7", color: "#92400E" },
  restocked: { label: "Restocked",   bg: "#D1FAE5", color: "#065F46" },
};

const getProperty = (id) => PROPERTIES.find(p => p.id === id);

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Badge({ config, small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: small ? "2px 8px" : "4px 10px",
      borderRadius: 20, fontSize: small ? 11 : 12, fontWeight: 600,
      background: config.bg, color: config.color, whiteSpace: "nowrap",
    }}>
      {config.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: config.dot, display: "inline-block" }} />}
      {config.label}
    </span>
  );
}

function Avatar({ name, size = 32 }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const hue = name.charCodeAt(0) * 7 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue}, 55%, 55%)`,
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

function Card({ children, style: s, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: COLORS.white, borderRadius: 16, border: `1px solid ${COLORS.border}`,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 20,
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.15s, transform 0.15s",
      ...s,
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = "0 4px 16px rgba(27,79,216,0.13)"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "none"; }}}
    >
      {children}
    </div>
  );
}

function Button({ children, variant = "primary", onClick, small, style: s }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: small ? "6px 14px" : "10px 20px",
    borderRadius: 10, fontSize: small ? 12 : 14, fontWeight: 600,
    border: "none", cursor: "pointer", transition: "all 0.15s", fontFamily: FONT,
  };
  const variants = {
    primary: { background: COLORS.blue, color: "#fff" },
    outline: { background: "transparent", color: COLORS.blue, border: `1.5px solid ${COLORS.blue}` },
    ghost:   { background: "transparent", color: COLORS.slate, border: `1.5px solid ${COLORS.border}` },
    green:   { background: COLORS.green, color: "#fff" },
    amber:   { background: COLORS.amber, color: "#fff" },
    red:     { background: COLORS.red,   color: "#fff" },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant], ...s }}
      onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
    >{children}</button>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || COLORS.navy, fontFamily: DISPLAY }}>{value}</div>
      <div style={{ fontSize: 12, color: COLORS.slate, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, background: COLORS.sky, padding: 4, borderRadius: 12, marginBottom: 24 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
          fontFamily: FONT, fontWeight: 600, fontSize: 13,
          background: active === t.id ? COLORS.white : "transparent",
          color: active === t.id ? COLORS.blue : COLORS.slate,
          boxShadow: active === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <span>{t.icon}</span> {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────

function AuthShell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.white, borderRadius: 20, padding: 40, width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(27,79,216,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: COLORS.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>B</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: COLORS.navy, fontFamily: DISPLAY }}>Bluerock</div>
            <div style={{ fontSize: 11, color: COLORS.slate }}>Property Management</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldInput({ label, type = "text", value, onChange, placeholder, onKeyDown }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.slate, display: "block", marginBottom: 4 }}>{label}</label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13, boxSizing: "border-box", outline: "none" }}
      />
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{msg}</div>;
}

function LoginScreen({ onLogin, onGoSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handle = () => {
    const account = loadAccounts().find(a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password);
    if (!account) { setError("Incorrect email or password."); return; }
    onLogin(account);
  };

  return (
    <AuthShell>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 24, color: COLORS.navy, marginBottom: 6 }}>Welcome back</h2>
      <p style={{ fontSize: 13, color: COLORS.slate, marginBottom: 24 }}>Sign in to your account</p>
      <ErrorBox msg={error} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <FieldInput label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === "Enter" && handle()} />
        <FieldInput label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handle()} />
      </div>
      <Button onClick={handle} style={{ width: "100%", justifyContent: "center", marginTop: 20 }}>Sign In</Button>
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: COLORS.slate }}>
        Don't have an account?{" "}
        <span onClick={onGoSignup} style={{ color: COLORS.blue, fontWeight: 600, cursor: "pointer" }}>Create one</span>
      </div>
    </AuthShell>
  );
}

function SignupScreen({ onSignup, onGoLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  const handle = () => {
    if (!name.trim() || !email.trim() || !password || !role) { setError("Please fill in all fields."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    const accounts = loadAccounts();
    if (accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase())) { setError("An account with this email already exists."); return; }
    const isOwner = OWNER_EMAILS.includes(email.trim().toLowerCase());
    const newAccount = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: isOwner ? "owner" : role,
      authorized: isOwner,
    };
    saveAccounts([...accounts, newAccount]);
    onSignup(newAccount);
  };

  return (
    <AuthShell>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 24, color: COLORS.navy, marginBottom: 6 }}>Create account</h2>
      <p style={{ fontSize: 13, color: COLORS.slate, marginBottom: 24 }}>Join your team on Bluerock</p>
      <ErrorBox msg={error} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FieldInput label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        <FieldInput label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <FieldInput label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" />
        <FieldInput label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" onKeyDown={e => e.key === "Enter" && handle()} />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.slate, display: "block", marginBottom: 8 }}>I am a...</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { value: "manager", label: "Owner / Manager", icon: "🏠", desc: "Full dashboard access" },
              { value: "cleaner", label: "Cleaner", icon: "🧹", desc: "Job & inventory access" },
            ].map(r => (
              <div key={r.value} onClick={() => setRole(r.value)} style={{
                padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${role === r.value ? COLORS.blue : COLORS.border}`,
                background: role === r.value ? COLORS.sky : "#fff",
                transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{r.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: role === r.value ? COLORS.blue : COLORS.navy }}>{r.label}</div>
                <div style={{ fontSize: 11, color: COLORS.slate, marginTop: 2 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Button onClick={handle} style={{ width: "100%", justifyContent: "center", marginTop: 20 }}>Create Account</Button>
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: COLORS.slate }}>
        Already have an account?{" "}
        <span onClick={onGoLogin} style={{ color: COLORS.blue, fontWeight: 600, cursor: "pointer" }}>Sign in</span>
      </div>
    </AuthShell>
  );
}

function PendingAuthScreen({ currentUser, onLogout }) {
  return (
    <AuthShell>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 24, color: COLORS.navy, marginBottom: 8 }}>Awaiting Authorization</h2>
        <p style={{ fontSize: 13, color: COLORS.slate, marginBottom: 24, lineHeight: 1.6 }}>
          Hi <strong>{currentUser.name}</strong>, your account is pending approval from an owner. You'll have access as soon as they authorize you — this only needs to happen once.
        </p>
        <div style={{ background: COLORS.sky, borderRadius: 12, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: COLORS.slate, textAlign: "left" }}>
          <div>Signed in as <strong>{currentUser.email}</strong></div>
          <div style={{ marginTop: 4 }}>Role: <strong style={{ textTransform: "capitalize" }}>{currentUser.role}</strong></div>
        </div>
        <Button variant="ghost" onClick={onLogout}>Sign out</Button>
      </div>
    </AuthShell>
  );
}

// ─── TEAM VIEW (owner only) ───────────────────────────────────────────────────

function TeamView({ currentUser }) {
  const [accounts, setAccounts] = useState(() => loadAccounts());

  const refresh = () => setAccounts(loadAccounts());

  const authorize = (id) => {
    const updated = accounts.map(a => a.id === id ? { ...a, authorized: true } : a);
    saveAccounts(updated);
    setAccounts(updated);
  };

  const revoke = (id) => {
    const updated = accounts.map(a => a.id === id ? { ...a, authorized: false } : a);
    saveAccounts(updated);
    setAccounts(updated);
  };

  const pending    = accounts.filter(a => !a.authorized && a.role !== "owner");
  const authorized = accounts.filter(a => a.authorized && a.role !== "owner");
  const owners     = accounts.filter(a => a.role === "owner");

  const roleLabel = (r) => r === "manager" ? "Owner / Manager" : r.charAt(0).toUpperCase() + r.slice(1);

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, fontFamily: DISPLAY, margin: 0 }}>Pending Authorization</h3>
            <span style={{ background: COLORS.red, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{pending.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map(u => (
              <Card key={u.id} style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={u.name} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.navy }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.slate }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: COLORS.slate, marginTop: 2 }}>{roleLabel(u.role)}</div>
                  </div>
                  <Button small variant="green" onClick={() => authorize(u.id)}>Authorize</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, fontFamily: DISPLAY, marginBottom: 14 }}>Authorized Team</h3>
        {authorized.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.slate }}>No authorized team members yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {authorized.map(u => (
              <Card key={u.id} style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={u.name} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.navy }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.slate }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: COLORS.slate, marginTop: 2 }}>{roleLabel(u.role)}</div>
                  </div>
                  <Badge config={{ label: "Authorized", bg: "#D1FAE5", color: "#065F46" }} small />
                  <Button small variant="ghost" onClick={() => revoke(u.id)}>Revoke</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, fontFamily: DISPLAY, marginBottom: 14 }}>Owners</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {owners.length === 0 ? (
            <div style={{ fontSize: 13, color: COLORS.slate }}>No owners registered yet.</div>
          ) : owners.map(u => (
            <Card key={u.id} style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={u.name} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.navy }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.slate }}>{u.email}</div>
                </div>
                <Badge config={{ label: "Owner", bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6" }} small />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── VIEWS ───────────────────────────────────────────────────────────────────

function DashboardView({ jobs, inventory, currentUser }) {
  const total = jobs.length;
  const complete = jobs.filter(j => j.status === "complete").length;
  const inProgress = jobs.filter(j => j.status === "in-progress").length;
  const pending = jobs.filter(j => j.status === "pending").length;
  const needsRestock = inventory.filter(i => i.status === "pending").length;

  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, #1B3A6B 100%)`,
        borderRadius: 20, padding: "28px 32px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 20,
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 4 }}>Today — April 19, 2026</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, fontFamily: DISPLAY }}>Good morning, {currentUser.name} 👋</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>
            {inProgress > 0 ? `${inProgress} clean${inProgress > 1 ? "s" : ""} in progress right now` : "No active cleans at the moment"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          <Stat label="Total Jobs" value={total} color="#fff" />
          <Stat label="Complete" value={complete} color={COLORS.green} />
          <Stat label="In Progress" value={inProgress} color="#60A5FA" />
          <Stat label="Pending" value={pending} color={COLORS.amber} />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontFamily: DISPLAY }}>Properties</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {PROPERTIES.map(p => {
            const pJobs = jobs.filter(j => j.propertyId === p.id);
            const active = pJobs.find(j => j.status === "in-progress");
            const next = pJobs.find(j => j.status === "pending");
            return (
              <Card key={p.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.navy }}>{p.name}</div>
                </div>
                <div style={{ fontSize: 12, color: COLORS.slate, marginBottom: 12 }}>{p.address}</div>
                {active ? (
                  <Badge config={statusConfig["in-progress"]} small />
                ) : next ? (
                  <div style={{ fontSize: 12, color: COLORS.slate }}>Next clean: <strong>{next.checkoutDate}</strong></div>
                ) : (
                  <div style={{ fontSize: 12, color: COLORS.slate }}>No upcoming jobs</div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {needsRestock > 0 && (
        <Card style={{ background: "#FFF7ED", border: "1px solid #FED7AA", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <div>
              <div style={{ fontWeight: 700, color: "#9A3412", fontSize: 14 }}>{needsRestock} item{needsRestock > 1 ? "s" : ""} need restocking</div>
              <div style={{ fontSize: 12, color: "#C2410C" }}>Check the Inventory tab to review and order</div>
            </div>
          </div>
        </Card>
      )}

      <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontFamily: DISPLAY }}>Recent Jobs</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {jobs.slice(0, 4).map(job => {
          const prop = getProperty(job.propertyId);
          return (
            <Card key={job.id} style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 40, borderRadius: 4, background: prop.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.navy }}>{prop.name}</span>
                    <Badge config={statusConfig[job.status]} small />
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.slate }}>
                    Checkout: {job.checkoutDate} → Checkin: {job.checkinDate} · {job.cleaner}
                  </div>
                </div>
                {job.status === "complete" && (
                  <div style={{ fontSize: 12, color: COLORS.slate, textAlign: "right" }}>
                    <div>✓ Done {job.completedAt}</div>
                    <div style={{ color: COLORS.lightBlue }}>📷 {job.photos} photos</div>
                  </div>
                )}
                {job.status === "in-progress" && (
                  <div style={{ fontSize: 12, color: COLORS.slate }}>Arrived {job.arrivedAt}</div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CalendarView({ jobs }) {
  const [syncStatus, setSyncStatus] = useState("idle");
  const [icalUrl, setIcalUrl] = useState("");
  const [selectedProp, setSelectedProp] = useState(null);

  const handleSync = () => {
    setSyncStatus("syncing");
    setTimeout(() => setSyncStatus("done"), 1800);
  };

  return (
    <div>
      <Card style={{ marginBottom: 24, background: COLORS.sky, border: `1px solid #BFDBFE` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>📅</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.navy }}>Airbnb iCal Sync</div>
            <div style={{ fontSize: 12, color: COLORS.slate }}>Paste your Airbnb calendar export URL to auto-generate cleaning jobs</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <select value={selectedProp || ""} onChange={e => setSelectedProp(e.target.value)} style={{
            padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
            fontFamily: FONT, fontSize: 13, color: COLORS.navy, background: "#fff", flex: "0 0 180px",
          }}>
            <option value="">Select property…</option>
            {PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input value={icalUrl} onChange={e => setIcalUrl(e.target.value)}
            placeholder="https://www.airbnb.com/calendar/ical/..."
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13, color: COLORS.navy }}
          />
          <Button onClick={handleSync} small>
            {syncStatus === "syncing" ? "⏳ Syncing…" : syncStatus === "done" ? "✓ Synced" : "🔄 Sync Now"}
          </Button>
        </div>
        {syncStatus === "done" && (
          <div style={{ fontSize: 12, color: COLORS.green, fontWeight: 600 }}>
            ✓ Calendar synced — 3 checkout dates imported, 1 new cleaning job created
          </div>
        )}
      </Card>

      {PROPERTIES.map(prop => {
        const propJobs = jobs.filter(j => j.propertyId === prop.id);
        return (
          <div key={prop.id} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: prop.color }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, fontFamily: DISPLAY, margin: 0 }}>{prop.name}</h3>
              <div style={{ fontSize: 12, color: COLORS.slate }}>{prop.address}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {propJobs.length === 0 && (
                <div style={{ fontSize: 13, color: COLORS.slate, padding: "12px 0" }}>No jobs scheduled yet.</div>
              )}
              {propJobs.map(job => (
                <Card key={job.id} style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 22 }}>🧹</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.navy }}>Cleaning on {job.checkoutDate}</span>
                        <Badge config={statusConfig[job.status]} small />
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.slate }}>
                        Guest checks in: <strong>{job.checkinDate}</strong> · Assigned to: {job.cleaner}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JobsView({ jobs, setJobs }) {
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(null);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newJob, setNewJob] = useState({ propertyId: "", checkoutDate: "", checkinDate: "", cleaner: "Maria S." });

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);

  const updateStatus = (jobId, newStatus) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (newStatus === "in-progress") return { ...j, status: "in-progress", arrivedAt: now };
      if (newStatus === "complete") return { ...j, status: "complete", completedAt: now };
      return j;
    }));
    setShowModal(null);
  };

  const addJob = () => {
    if (!newJob.propertyId || !newJob.checkoutDate || !newJob.checkinDate) return;
    setJobs(prev => [...prev, {
      id: Date.now(), propertyId: parseInt(newJob.propertyId),
      checkoutDate: newJob.checkoutDate, checkinDate: newJob.checkinDate,
      status: "pending", arrivedAt: null, completedAt: null, photos: 0, cleaner: newJob.cleaner,
    }]);
    setShowNewJob(false);
    setNewJob({ propertyId: "", checkoutDate: "", checkinDate: "", cleaner: "Maria S." });
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {["all", "pending", "in-progress", "complete"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            fontFamily: FONT, fontSize: 12, fontWeight: 600, transition: "all 0.15s",
            background: filter === f ? COLORS.blue : COLORS.sky,
            color: filter === f ? "#fff" : COLORS.slate,
          }}>
            {f === "all" ? "All" : statusConfig[f].label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <Button small onClick={() => setShowNewJob(true)}>+ New Job</Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(job => {
          const prop = getProperty(job.propertyId);
          return (
            <Card key={job.id} onClick={() => setShowModal(job)} style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 4, height: 56, borderRadius: 4, background: prop.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.navy }}>{prop.name}</span>
                    <Badge config={statusConfig[job.status]} small />
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.slate, marginBottom: 4 }}>
                    Checkout: {job.checkoutDate} → Check-in: {job.checkinDate}
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: COLORS.slate }}>
                    <span>👤 {job.cleaner}</span>
                    {job.arrivedAt && <span>🕐 Arrived {job.arrivedAt}</span>}
                    {job.completedAt && <span>✓ Done {job.completedAt}</span>}
                    {job.photos > 0 && <span>📷 {job.photos} photos</span>}
                  </div>
                </div>
                <span style={{ color: COLORS.slate, fontSize: 18 }}>›</span>
              </div>
            </Card>
          );
        })}
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(null)}>
          <JobDetail job={showModal} onUpdateStatus={updateStatus} onClose={() => setShowModal(null)} />
        </Modal>
      )}

      {showNewJob && (
        <Modal onClose={() => setShowNewJob(false)}>
          <div>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 20, color: COLORS.navy, marginBottom: 20 }}>Create New Job</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Property", field: "propertyId", type: "select", opts: PROPERTIES.map(p => ({ v: p.id, l: p.name })) },
                { label: "Checkout Date", field: "checkoutDate", type: "date" },
                { label: "Check-in Date", field: "checkinDate", type: "date" },
                { label: "Assign To", field: "cleaner", type: "select", opts: [{ v: "Maria S.", l: "Maria S." }, { v: "James T.", l: "James T." }] },
              ].map(({ label, field, type, opts }) => (
                <div key={field}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.slate, display: "block", marginBottom: 4 }}>{label}</label>
                  {type === "select" ? (
                    <select value={newJob[field]} onChange={e => setNewJob(p => ({ ...p, [field]: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13 }}>
                      <option value="">Select…</option>
                      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={newJob[field]} onChange={e => setNewJob(p => ({ ...p, [field]: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Button onClick={addJob}>Create Job</Button>
              <Button variant="ghost" onClick={() => setShowNewJob(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function JobDetail({ job, onUpdateStatus, onClose }) {
  const prop = getProperty(job.propertyId);
  const [photos, setPhotos] = useState(Array.from({ length: job.photos }, (_, i) => `photo_${i + 1}`));
  const [showUpload, setShowUpload] = useState(false);

  const fakeUpload = () => {
    setPhotos(p => [...p, `photo_${Date.now()}`]);
    setShowUpload(false);
  };

  const roomLabels = ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Entry"];
  const photoColors = ["#DBEAFE", "#D1FAE5", "#FEF3C7", "#FCE7F3", "#EDE9FE"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: prop.color }} />
        <h3 style={{ fontFamily: DISPLAY, fontSize: 20, color: COLORS.navy, margin: 0 }}>{prop.name}</h3>
        <Badge config={statusConfig[job.status]} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          ["Checkout", job.checkoutDate],
          ["Next Check-in", job.checkinDate],
          ["Assigned To", job.cleaner],
          ["Arrived", job.arrivedAt || "—"],
          ["Completed", job.completedAt || "—"],
          ["Photos", photos.length],
        ].map(([l, v]) => (
          <div key={l} style={{ background: COLORS.surface, borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: COLORS.slate, marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy }}>{v}</div>
          </div>
        ))}
      </div>

      {job.status === "pending" && (
        <Button variant="amber" onClick={() => onUpdateStatus(job.id, "in-progress")} style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
          🕐 Mark as In Progress
        </Button>
      )}
      {job.status === "in-progress" && (
        <Button variant="green" onClick={() => onUpdateStatus(job.id, "complete")} style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
          ✓ Mark as Complete
        </Button>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.navy }}>After-Clean Photos</div>
          <Button small variant="outline" onClick={() => setShowUpload(true)}>+ Upload Photo</Button>
        </div>
        {photos.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.slate, padding: "12px 0" }}>No photos uploaded yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {photos.map((p, i) => (
              <div key={p} style={{
                aspectRatio: "4/3", borderRadius: 10,
                background: photoColors[i % photoColors.length],
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                fontSize: 22, color: COLORS.slate,
              }}>
                <div>📷</div>
                <div style={{ fontSize: 10, marginTop: 4, color: COLORS.slate }}>{roomLabels[i % roomLabels.length]}</div>
              </div>
            ))}
          </div>
        )}
        {showUpload && (
          <div style={{ marginTop: 12, padding: 14, background: COLORS.sky, borderRadius: 10, border: `1px dashed ${COLORS.lightBlue}`, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
            <div style={{ fontSize: 13, color: COLORS.slate, marginBottom: 10 }}>Select photos from your device</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Button small onClick={fakeUpload}>📷 Simulate Upload</Button>
              <Button small variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InventoryView({ inventory, setInventory }) {
  const [showFlag, setShowFlag] = useState(false);
  const [newFlag, setNewFlag] = useState({ propertyId: "", item: "", custom: "" });
  const [filterStatus, setFilterStatus] = useState("all");

  const updateStatus = (id, status) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const addFlag = () => {
    const item = newFlag.item === "custom" ? newFlag.custom : newFlag.item;
    if (!newFlag.propertyId || !item) return;
    setInventory(prev => [...prev, {
      id: Date.now(), propertyId: parseInt(newFlag.propertyId), item,
      flaggedAt: "Just now", status: "pending", cleaner: "Maria S.",
    }]);
    setShowFlag(false);
    setNewFlag({ propertyId: "", item: "", custom: "" });
  };

  const filtered = filterStatus === "all" ? inventory : inventory.filter(i => i.status === filterStatus);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Needs Order", value: inventory.filter(i => i.status === "pending").length, color: COLORS.red, bg: "#FEE2E2" },
          { label: "Ordered", value: inventory.filter(i => i.status === "ordered").length, color: COLORS.amber, bg: "#FEF3C7" },
          { label: "Restocked", value: inventory.filter(i => i.status === "restocked").length, color: COLORS.green, bg: "#D1FAE5" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: DISPLAY }}>{s.value}</div>
            <div style={{ fontSize: 12, color: COLORS.slate, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {["all", "pending", "ordered", "restocked"].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)} style={{
            padding: "5px 13px", borderRadius: 20, border: "none", cursor: "pointer",
            fontFamily: FONT, fontSize: 12, fontWeight: 600,
            background: filterStatus === f ? COLORS.navy : COLORS.sky,
            color: filterStatus === f ? "#fff" : COLORS.slate,
          }}>
            {f === "all" ? "All" : invConfig[f]?.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <Button small onClick={() => setShowFlag(true)}>+ Flag Item</Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(inv => {
          const prop = getProperty(inv.propertyId);
          return (
            <Card key={inv.id} style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>📦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.navy }}>{inv.item}</span>
                    <Badge config={invConfig[inv.status]} small />
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.slate }}>
                    {prop.name} · Flagged by {inv.cleaner} · {inv.flaggedAt}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {inv.status === "pending" && (
                    <Button small variant="amber" onClick={() => updateStatus(inv.id, "ordered")}>Mark Ordered</Button>
                  )}
                  {inv.status === "ordered" && (
                    <Button small variant="green" onClick={() => updateStatus(inv.id, "restocked")}>Mark Restocked</Button>
                  )}
                  {inv.status === "restocked" && (
                    <span style={{ fontSize: 12, color: COLORS.green, fontWeight: 600 }}>✓ Done</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: COLORS.slate, fontSize: 14 }}>
            No items in this category 🎉
          </div>
        )}
      </div>

      {showFlag && (
        <Modal onClose={() => setShowFlag(false)}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 20, color: COLORS.navy, marginBottom: 20 }}>Flag Low Inventory</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.slate, display: "block", marginBottom: 4 }}>Property</label>
              <select value={newFlag.propertyId} onChange={e => setNewFlag(p => ({ ...p, propertyId: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13 }}>
                <option value="">Select property…</option>
                {PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.slate, display: "block", marginBottom: 4 }}>Item</label>
              <select value={newFlag.item} onChange={e => setNewFlag(p => ({ ...p, item: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13 }}>
                <option value="">Select item…</option>
                {CHECKLIST_ITEMS.map(i => <option key={i} value={i}>{i}</option>)}
                <option value="custom">+ Custom item…</option>
              </select>
            </div>
            {newFlag.item === "custom" && (
              <input placeholder="Enter item name…" value={newFlag.custom} onChange={e => setNewFlag(p => ({ ...p, custom: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13, boxSizing: "border-box" }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <Button onClick={addFlag}>Flag Item</Button>
            <Button variant="ghost" onClick={() => setShowFlag(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,22,40,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: COLORS.white, borderRadius: 20, padding: 28, width: "100%", maxWidth: 520,
        maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        animation: "slideUp 0.2s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: COLORS.slate, padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── CLEANER VIEW ─────────────────────────────────────────────────────────────
function CleanerView({ jobs, setJobs, inventory, setInventory, currentUser }) {
  const [showInventory, setShowInventory] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [customItem, setCustomItem] = useState("");
  const [selectedProp, setSelectedProp] = useState(1);

  const myJobs = jobs.filter(j => j.cleaner === currentUser.name && j.status !== "complete");

  const updateStatus = (jobId, newStatus) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (newStatus === "in-progress") return { ...j, status: "in-progress", arrivedAt: now };
      if (newStatus === "complete") return { ...j, status: "complete", completedAt: now };
      return j;
    }));
  };

  const submitInventory = () => {
    const all = [...selectedItems, ...(customItem ? [customItem] : [])];
    if (all.length === 0 || !selectedProp) return;
    setInventory(prev => [...prev, ...all.map(item => ({
      id: Date.now() + Math.random(), propertyId: selectedProp, item,
      flaggedAt: "Just now", status: "pending", cleaner: currentUser.name,
    }))]);
    setSelectedItems([]);
    setCustomItem("");
    setShowInventory(false);
  };

  const toggleItem = (item) => {
    setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <div style={{ background: COLORS.navy, borderRadius: 20, padding: "20px 20px 24px", marginBottom: 20, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Avatar name={currentUser.name} size={36} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{currentUser.name} — Cleaner</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Bluerock Property Management</div>
          </div>
        </div>
      </div>

      <h3 style={{ fontFamily: DISPLAY, fontSize: 17, color: COLORS.navy, marginBottom: 12 }}>My Upcoming Jobs</h3>
      {myJobs.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ color: COLORS.slate, fontSize: 14 }}>All caught up! No pending jobs.</div>
        </Card>
      ) : (
        myJobs.map(job => {
          const prop = getProperty(job.propertyId);
          return (
            <Card key={job.id} style={{ marginBottom: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: prop.color }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.navy }}>{prop.name}</span>
                <Badge config={statusConfig[job.status]} small />
              </div>
              <div style={{ fontSize: 12, color: COLORS.slate, marginBottom: 14 }}>
                Checkout: {job.checkoutDate} · Check-in: {job.checkinDate}
              </div>
              {job.status === "pending" && (
                <Button variant="amber" onClick={() => updateStatus(job.id, "in-progress")} style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px" }}>
                  🕐 I'm Here — Start Clean
                </Button>
              )}
              {job.status === "in-progress" && (
                <div>
                  <div style={{ fontSize: 12, color: COLORS.slate, marginBottom: 10 }}>🕐 Started at {job.arrivedAt}</div>
                  <Button variant="green" onClick={() => updateStatus(job.id, "complete")} style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px" }}>
                    ✓ Cleaning Complete
                  </Button>
                </div>
              )}
            </Card>
          );
        })
      )}

      <Card style={{ marginTop: 8, background: "#FFF7ED", border: "1px solid #FED7AA" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }}>📦</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#9A3412" }}>Low on supplies?</div>
            <div style={{ fontSize: 12, color: "#C2410C" }}>Flag items for the owner to reorder</div>
          </div>
        </div>
        <Button variant="amber" onClick={() => setShowInventory(true)} style={{ width: "100%", justifyContent: "center" }}>
          Flag Low Inventory
        </Button>
      </Card>

      {showInventory && (
        <Modal onClose={() => setShowInventory(false)}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 20, color: COLORS.navy, marginBottom: 6 }}>Flag Low Inventory</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.slate, display: "block", marginBottom: 4 }}>Property</label>
            <select value={selectedProp} onChange={e => setSelectedProp(parseInt(e.target.value))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13 }}>
              {PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.slate, marginBottom: 8 }}>Select items that are low:</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
            {CHECKLIST_ITEMS.map(item => (
              <div key={item} onClick={() => toggleItem(item)} style={{
                padding: "9px 12px", borderRadius: 9, cursor: "pointer",
                border: `1.5px solid ${selectedItems.includes(item) ? COLORS.blue : COLORS.border}`,
                background: selectedItems.includes(item) ? COLORS.sky : "#fff",
                fontSize: 12, fontWeight: 500, color: selectedItems.includes(item) ? COLORS.blue : COLORS.navy,
                transition: "all 0.12s",
              }}>
                {selectedItems.includes(item) ? "✓ " : ""}{item}
              </div>
            ))}
          </div>
          <input placeholder="+ Custom item…" value={customItem} onChange={e => setCustomItem(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13, marginBottom: 14, boxSizing: "border-box" }} />
          <Button onClick={submitInventory} style={{ width: "100%", justifyContent: "center" }}>
            Submit Flags ({selectedItems.length + (customItem ? 1 : 0)})
          </Button>
        </Modal>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authScreen, setAuthScreen] = useState("login");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [inventory, setInventory] = useState(INVENTORY_FLAGS);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      const user = loadAccounts().find(a => a.id === session.userId);
      if (user) setCurrentUser(user);
    }
    setSessionChecked(true);
  }, []);

  const handleLogin = (account) => {
    saveSession({ userId: account.id });
    setCurrentUser(account);
    setTab("dashboard");
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setAuthScreen("login");
    setTab("dashboard");
  };

  if (!sessionChecked) return null;

  if (!currentUser) {
    return authScreen === "login"
      ? <LoginScreen onLogin={handleLogin} onGoSignup={() => setAuthScreen("signup")} />
      : <SignupScreen onSignup={handleLogin} onGoLogin={() => setAuthScreen("login")} />;
  }

  if (!currentUser.authorized) {
    return <PendingAuthScreen currentUser={currentUser} onLogout={handleLogout} />;
  }

  const isOwner = currentUser.role === "owner";
  const pendingCount = isOwner ? loadAccounts().filter(a => !a.authorized && a.role !== "owner").length : 0;

  const ownerTabs = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "calendar",  label: "Calendar",  icon: "📅" },
    { id: "jobs",      label: "Jobs",      icon: "🧹" },
    { id: "inventory", label: "Inventory", icon: "📦" },
    ...(isOwner ? [{ id: "team", label: "Team", icon: "👥" }] : []),
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F0F4FF; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#EEF2FF", fontFamily: FONT }}>
        {/* Top nav */}
        <div style={{
          background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`,
          padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 60, position: "sticky", top: 0, zIndex: 50,
          boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: COLORS.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>B</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: COLORS.navy, fontFamily: DISPLAY }}>Bluerock</div>
              <div style={{ fontSize: 10, color: COLORS.slate, marginTop: -2 }}>Property Management</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {isOwner && pendingCount > 0 && (
              <div
                onClick={() => setTab("team")}
                title={`${pendingCount} pending authorization${pendingCount > 1 ? "s" : ""}`}
                style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.red, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                {pendingCount}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={currentUser.name} size={30} />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy }}>{currentUser.name}</div>
                <div style={{ fontSize: 10, color: COLORS.slate, textTransform: "capitalize" }}>
                  {currentUser.role === "owner" ? "Owner" : currentUser.role === "manager" ? "Owner / Manager" : "Cleaner"}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} style={{
              background: "none", border: `1.5px solid ${COLORS.border}`, borderRadius: 8,
              padding: "5px 12px", cursor: "pointer", fontFamily: FONT, fontSize: 12,
              color: COLORS.slate, fontWeight: 600,
            }}>Sign out</button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px" }}>
          {currentUser.role === "cleaner" ? (
            <CleanerView jobs={jobs} setJobs={setJobs} inventory={inventory} setInventory={setInventory} currentUser={currentUser} />
          ) : (
            <>
              <Tabs tabs={ownerTabs} active={tab} onChange={setTab} />
              {tab === "dashboard" && <DashboardView jobs={jobs} inventory={inventory} currentUser={currentUser} />}
              {tab === "calendar"  && <CalendarView jobs={jobs} />}
              {tab === "jobs"      && <JobsView jobs={jobs} setJobs={setJobs} />}
              {tab === "inventory" && <InventoryView inventory={inventory} setInventory={setInventory} />}
              {tab === "team"      && isOwner && <TeamView currentUser={currentUser} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
