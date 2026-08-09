import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const [name, setName] = useState("");
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      if (needsOwner) {
        await login({ email, password });
        navigate("/workspaces");
      } else {
        navigate("/login");
      }
    } catch {
      setError(needsOwner ? "Could not create the owner account. Try again." : "Registration failed. Check the form and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (needsOwner === null) {
    return <div className="screen-message">Loading</div>;
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-heading">
          <img className="auth-logo" src="/icon.svg" alt="OneOpen Loom" width={56} height={56} />
          <h1>{needsOwner ? "Create Owner Account" : "Create Account"}</h1>
          <p>
            {needsOwner
              ? "No users exist yet. Set up the first owner account to unlock OneOpen Loom."
              : "Start a OneOpen Loom workspace."}
          </p>
        </div>
        {needsOwner ? (
          <div className="info-banner">This first account becomes the instance owner and can create workspaces.</div>
        ) : null}
        <form className="form-stack" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input
            label="Password"
            type="password"
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            {needsOwner ? "Create Owner Account" : "Register"}
          </Button>
        </form>
        {!needsOwner ? (
          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
