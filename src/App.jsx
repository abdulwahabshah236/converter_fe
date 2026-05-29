import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:30002";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("jwt") || "");
  const [file, setFile] = useState(null);
  const [fid, setFid] = useState("");
  const [busy, setBusy] = useState({ login: false, signup: false, upload: false, download: false });
  const [status, setStatus] = useState({ tone: "idle", message: "Ready." });

  const saveToken = (value) => {
    setToken(value);
    if (value) {
      localStorage.setItem("jwt", value);
    } else {
      localStorage.removeItem("jwt");
    }
  };

  const setMessage = (tone, message) => setStatus({ tone, message });

  const handleSignup = async (event) => {
    event.preventDefault();
    if (!signupEmail || !signupPassword) {
      setMessage("warn", "Email and password are required to sign up.");
      return;
    }

    try {
      setBusy((prev) => ({ ...prev, signup: true }));
      const response = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
        }),
      });
      const text = await response.text();
      if (!response.ok) {
        setMessage("error", text || "Signup failed.");
        return;
      }
      setSignupPassword("");
      setMessage("ok", "Account created. Sign in to continue.");
    } catch (err) {
      setMessage("error", "Signup failed. Is the API running?");
    } finally {
      setBusy((prev) => ({ ...prev, signup: false }));
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      setMessage("warn", "Email and password are required.");
      return;
    }

    try {
      setBusy((prev) => ({ ...prev, login: true }));
      const basic = btoa(`${email}:${password}`);
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
        },
      });
      const text = await response.text();
      if (!response.ok) {
        setMessage("error", text || "Login failed.");
        return;
      }
      saveToken(text);
      setMessage("ok", "Login successful. Token stored.");
    } catch (err) {
      setMessage("error", "Login failed. Is the API running?");
    } finally {
      setBusy((prev) => ({ ...prev, login: false }));
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!token) {
      setMessage("warn", "Login first, then upload a video file.");
      return;
    }
    if (!file) {
      setMessage("warn", "Pick a video file to upload.");
      return;
    }

    try {
      setBusy((prev) => ({ ...prev, upload: true }));
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const text = await response.text();
      if (!response.ok) {
        setMessage("error", text || "Upload failed.");
        return;
      }
      setMessage(
        "ok",
        "Upload complete. The MP3 file id will arrive by email."
      );
    } catch (err) {
      setMessage("error", "Upload failed. Check the API and RabbitMQ.");
    } finally {
      setBusy((prev) => ({ ...prev, upload: false }));
    }
  };

  const handleDownload = async (event) => {
    event.preventDefault();
    if (!token) {
      setMessage("warn", "Login first, then download by file id.");
      return;
    }
    if (!fid.trim()) {
      setMessage("warn", "Enter the file id from your email.");
      return;
    }

    try {
      setBusy((prev) => ({ ...prev, download: true }));
      const response = await fetch(
        `${API_BASE}/download?fid=${encodeURIComponent(fid.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        const text = await response.text();
        setMessage("error", text || "Download failed.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fid.trim()}.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("ok", "Download started.");
    } catch (err) {
      setMessage("error", "Download failed. Check the API.");
    } finally {
      setBusy((prev) => ({ ...prev, download: false }));
    }
  };

  const handleLogout = () => {
    saveToken("");
    setMessage("idle", "Token cleared.");
  };

  return (
    <div className="page">
      <div className="bg-orb orb-one" aria-hidden="true" />
      <div className="bg-orb orb-two" aria-hidden="true" />
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Microservices demo</p>
          <h1>Video to MP3 Converter</h1>
          <p className="subhead">
            Spin up the stack, create a user, and move a video through the queue
            pipeline. You will get the MP3 id for download at the end.
          </p>
          <div className="hero-meta">
            <span className={`pill ${token ? "ok" : "warn"}`}>
              {token ? "Token ready" : "Not logged in"}
            </span>
            <span className="pill ghost">API: {API_BASE}</span>
          </div>
        </div>
        <aside className="hero-panel">
          <div className="panel-title">Flow snapshot</div>
          <ul className="flow-list">
            <li>
              <span>01</span>
              <div>
                <strong>Sign up</strong>
                <p>Create a new auth record.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Login</strong>
                <p>Receive a JWT for uploads.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Upload</strong>
                <p>Gateway stores the video.</p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <strong>Download</strong>
                <p>Paste the MP3 file id.</p>
              </div>
            </li>
          </ul>
        </aside>
      </header>

      <main className="grid">
        <section className="card">
          <h2>1. Sign up</h2>
          <p>Create a new account in the auth service.</p>
          <form onSubmit={handleSignup} className="stack">
            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Choose a password"
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" disabled={busy.signup}>
              {busy.signup ? "Creating..." : "Create account"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>2. Login</h2>
          <p>Use your API credentials to receive a JWT.</p>
          <form onSubmit={handleLogin} className="stack">
            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <div className="actions">
              <button type="submit" disabled={busy.login}>
                {busy.login ? "Signing in..." : "Sign in"}
              </button>
              <button type="button" className="ghost" onClick={handleLogout}>
                Clear token
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>3. Upload video</h2>
          <p>MP4 or MOV recommended. Only one file per request.</p>
          <form onSubmit={handleUpload} className="stack">
            <input
              type="file"
              accept="video/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <button type="submit" disabled={busy.upload}>
              {busy.upload ? "Uploading..." : "Upload"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>4. Download MP3</h2>
          <p>Paste the MP3 file id you receive via email.</p>
          <form onSubmit={handleDownload} className="stack">
            <label>
              File id
              <input
                type="text"
                placeholder="64b2..."
                value={fid}
                onChange={(event) => setFid(event.target.value)}
              />
            </label>
            <button type="submit" disabled={busy.download}>
              {busy.download ? "Downloading..." : "Download"}
            </button>
          </form>
        </section>
      </main>

      <section className={`status ${status.tone}`}>
        <span>Status</span>
        <p>{status.message}</p>
        <small>API: {API_BASE}</small>
      </section>
    </div>
  );
}
