"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const f = new FormData(e.currentTarget);
    const r = await signIn("credentials", {
      email: f.get("email"),
      password: f.get("password"),
      redirect: false,
    });
    setCarregando(false);
    if (r?.error) setErro("E-mail ou senha inválidos.");
    else window.location.href = "/";
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>⚖️ QG do Escritório</h1>
        <p className="sub">Jonas Inácio · Advocacia Previdenciária</p>
        {erro && <p className="erro">{erro}</p>}
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn" disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
