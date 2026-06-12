import { useState } from "react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const ingresar = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/pagos/api/verificar-superusuario/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        onLogin();
      } else {
        setError(data.error || "Acceso denegado");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh"
    }}>
      <form
        onSubmit={ingresar}
        style={{
          width: "350px",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "10px"
        }}
      >
        <h2>Login Administrador</h2>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <button type="submit">
          Ingresar
        </button>

        {error && (
          <p style={{ color: "red" }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}