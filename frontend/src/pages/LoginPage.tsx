import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
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

  if (needsOwner === null) {
    return <div className="screen-message">Loading</div>;
  }

  if (needsOwner) {
    return <Navigate to="/register" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate("/workspaces");
    } catch {
      setError("Email or password was not accepted.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-heading">
          <img className="auth-logo" src="/icon.svg" alt="OneOpen Workboard" width={56} height={56} />
          <h1>OneOpen Workboard</h1>
          <p>Sign in to your community workspace.</p>
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
            Login
          </Button>
        </form>
        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
