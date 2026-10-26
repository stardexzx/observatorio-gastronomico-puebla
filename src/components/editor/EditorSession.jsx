import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { usesDatabase } from "../../services/api.js";
import {
  editorSession,
  editorLogin,
  editorLogout,
} from "../../services/editorApi.js";
const Context = createContext(null);
export function EditorSessionProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(usesDatabase),
    [error, setError] = useState("");
  async function refresh() {
    if (!usesDatabase) return;
    setLoading(true);
    try {
      setUser((await editorSession()).user);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let live = true;
    if (usesDatabase)
      editorSession()
        .then((r) => {
          if (live) setUser(r.user);
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    return () => {
      live = false;
    };
  }, []);
  const login = async (email, password) => {
    const result = await editorLogin(email, password);
    setUser(result.user);
    setError("");
  };
  const logout = async () => {
    await editorLogout();
    setUser(null);
  };
  return (
    <Context.Provider value={{ user, loading, error, login, logout, refresh }}>
      {children}
    </Context.Provider>
  );
}
export const useEditor = () => useContext(Context);
export function RequireEditor({ children }) {
  const session = useEditor(),
    location = useLocation();
  if (!usesDatabase)
    return (
      <div className="g-card editor-login">
        <h1>Acceso editorial</h1>
        <p>
          Estás en el modo de demostración. La captura y las autorizaciones
          están disponibles en la versión conectada.
        </p>
      </div>
    );
  if (session.loading)
    return <div className="loading-state">Comprobando acceso editorial…</div>;
  if (session.error)
    return (
      <div className="empty-state" role="alert">
        <p>{session.error}</p>
        <button className="g-btn" onClick={session.refresh}>
          Reintentar
        </button>
      </div>
    );
  if (!session.user) return <EditorLogin key={location.pathname} />;
  return children;
}
function EditorLogin() {
  const session = useEditor(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="g-card editor-login">
      <span className="g-tag blue">Administración</span>
      <h1>Acceso editorial</h1>
      <p className="g-p">
        Inicia sesión para documentar personas, guardar borradores y gestionar
        su publicación.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await session.login(email, password);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="editor-field">
          <span>Correo</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={250}
          />
        </label>
        <label className="editor-field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={500}
          />
        </label>
        {error && (
          <p className="editor-error" role="alert">
            {error}
          </p>
        )}
        <button className="g-btn p" disabled={busy}>
          {busy ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>
    </section>
  );
}
