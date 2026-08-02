import { useState } from "react";
import { Send, CheckCircle, Loader2 } from "lucide-react";

const PROJECT_TYPES = [
  "AI Literacy / Education",
  "Product / Build",
  "Partnership",
  "Speaking / Keynote",
  "Automation / Systems",
  "Other",
];

const BUDGET_RANGES = [
  "Under $10K",
  "$10K – $50K",
  "$50K – $200K",
  "$200K+",
  "Not sure / Discuss",
];

interface ContactFormProps {
  onSuccess?: () => void;
  source?: string;
}

export default function ContactForm({ onSuccess, source = "contact-modal" }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [projectType, setProjectType] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        projectType,
        budgetRange,
        message: message.trim(),
        source,
      }),
    });
    const supaError = res.ok ? null : new Error(
      (await res.json().catch(() => ({}))).error ?? "Submission failed",
    );

    setSubmitting(false);

    if (supaError) {
      setError("Something went wrong. Please try again.");
      console.error(supaError);
      return;
    }

    setSubmitted(true);
    onSuccess?.();
  };

  if (submitted) {
    return (
      <div className="contact-form-success">
        <CheckCircle className="w-10 h-10 text-emerald-400" />
        <p className="contact-form-success__title">Signal received.</p>
        <p className="contact-form-success__body">
          We will review your submission and reach out within 24–48 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      <div className="contact-form__grid">
        <div className="contact-form__field">
          <label className="contact-form__label">
            Name <span className="contact-form__required">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="contact-form__input"
            required
          />
        </div>

        <div className="contact-form__field">
          <label className="contact-form__label">
            Email <span className="contact-form__required">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="contact-form__input"
            required
          />
        </div>

        <div className="contact-form__field">
          <label className="contact-form__label">Company / Organization</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Inc."
            className="contact-form__input"
          />
        </div>

        <div className="contact-form__field">
          <label className="contact-form__label">Project Type</label>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="contact-form__input contact-form__select"
          >
            <option value="">Select...</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="contact-form__field">
          <label className="contact-form__label">Budget Range</label>
          <select
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
            className="contact-form__input contact-form__select"
          >
            <option value="">Select...</option>
            {BUDGET_RANGES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="contact-form__field contact-form__field--full">
        <label className="contact-form__label">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about the problem, the timeline, and what success looks like."
          className="contact-form__input contact-form__textarea"
          rows={5}
        />
      </div>

      {error && (
        <p className="contact-form__error">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="contact-form__submit"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send signal
          </>
        )}
      </button>
    </form>
  );
}
