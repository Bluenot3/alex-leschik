import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { NOTION_NEWSLETTER_FORM_URL } from "@/lib/notionForms";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }

    setSubmitting(true);

    const value = email.trim();

    // Backup record — the working list lives in Notion.
    const { error: supaError } = await supabase
      .from("newsletter_signups")
      .insert({ email: value });

    if (supaError && !supaError.message?.includes("duplicate")) {
      console.error(supaError);
    }

    // Confirm the subscription in Notion, the source of truth.
    window.open(
      `${NOTION_NEWSLETTER_FORM_URL}?prefill_Email=${encodeURIComponent(value)}`,
      "_blank",
      "noopener,noreferrer",
    );

    setSubmitting(false);
    setSubmitted(true);
    setEmail("");
  };

  if (submitted) {
    return (
      <div className="newsletter-signup newsletter-signup--success">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
        <span className="newsletter-signup__success-text">
          Confirm in the Notion tab to finish.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="newsletter-signup">
      <Mail className="w-3.5 h-3.5 text-muted-foreground/50" />
      <span className="newsletter-signup__label">ZEN Weekly</span>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="newsletter-signup__input"
      />
      <button
        type="submit"
        disabled={submitting}
        className="newsletter-signup__btn"
        aria-label="Subscribe"
      >
        {submitting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ArrowRight className="w-3 h-3" />
        )}
      </button>
      {error && <span className="newsletter-signup__error">{error}</span>}
    </form>
  );
}
