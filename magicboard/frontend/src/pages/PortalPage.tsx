import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { serviceDeskService } from "../services/serviceDeskService";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import type { PortalProjectInfo } from "../types/serviceDesk";

export default function PortalPage() {
  const { projectKey = "" } = useParams();
  const [info, setInfo] = useState<PortalProjectInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requestType, setRequestType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      const result = await serviceDeskService.getPortalInfo(projectKey);
      if (!cancelled) {
        setInfo(result);
        setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectKey]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await serviceDeskService.submitPortalRequest(projectKey, {
        summary,
        description: description || null,
        requester_email: requesterEmail,
        request_type: requestType || null
      });
      setSubmitted(true);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Could not submit your request. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel portal-panel">
        <div className="auth-heading">
          <h1>{info?.project_name ?? "Support Portal"}</h1>
          <p>{info?.description || "Submit a request and our team will follow up shortly."}</p>
        </div>

        {isLoading ? <div className="state-text">Loading…</div> : null}

        {!isLoading && submitted ? (
          <div className="empty-state">
            <div className="empty-state-title">Request submitted</div>
            <p>Thanks — we received your request and will be in touch by email.</p>
          </div>
        ) : null}

        {!isLoading && !submitted ? (
          <form className="form-stack" onSubmit={handleSubmit}>
            {error ? <div className="error-banner">{error}</div> : null}
            <Input label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} required />
            <label className="field" htmlFor="portal-description">
              <span>Description</span>
              <textarea id="portal-description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            {info?.request_types?.length ? (
              <Select
                label="Request Type"
                options={[{ label: "General request", value: "" }, ...info.request_types.map((type) => ({ label: type, value: type }))]}
                value={requestType}
                onChange={(event) => setRequestType(event.target.value)}
              />
            ) : null}
            <Input
              label="Your Email"
              type="email"
              value={requesterEmail}
              onChange={(event) => setRequesterEmail(event.target.value)}
              required
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit Request"}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
