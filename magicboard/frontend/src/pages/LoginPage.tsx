import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsOwner, setNeedsOwner] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    authService
      .getSetupStatus()
      .then((status) => {
        if (!cancelled) {
          setNeedsOwner(status.needs_owner);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNeedsOwner(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || needsOwner === null) {
    return <div className="screen-message">Loading</div>;
  }

  if (needsOwner) {
    return <Navigate to="/register" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      // Full reload avoids stale auth/layout state after login.
      window.location.assign("/");
    } catch (loginError) {
      setError(getApiErrorMessage(loginError, "Email or password was not accepted."));
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-heading">
          <img className="auth-logo" src="/icon.svg" alt="OneOpen Magicboard" width={56} height={56} />
          <h1>OneOpen Magicboard</h1>
          <p>Sign in to your knowledge workspace.</p>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Login"}
          </Button>
        </form>
        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
