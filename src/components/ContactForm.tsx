import { useState, useRef } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setStatus("sending");

    // Compose mailto with pre-filled fields — works without a backend
    const subject = encodeURIComponent(`[alex-leschik.com] Message from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.open(`mailto:hello@alexleschik.com?subject=${subject}&body=${body}`);

    // Mark as sent after a short delay to give the OS time to open the mail client
    setTimeout(() => {
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    }, 600);
  };

  return (
    <div className="contact-form-panel">
      {/* Panel header */}
      <div className="contact-form-panel__header">
        <div className="contact-form-panel__eyebrow">
          <span className="contact-form-panel__dot" />
          <span>Open channel</span>
        </div>
        <p className="contact-form-panel__tagline">
          Drop a line — I read every message.
        </p>
      </div>

      {status === "sent" ? (
        <div className="contact-form-panel__success">
          <svg viewBox="0 0 20 20" fill="none" className="contact-form-panel__check">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 10.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Message composed. Your mail client should be open.</span>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="contact-form-panel__form">
          <div className="contact-form-panel__row">
            <div className="contact-form-panel__field">
              <label className="contact-form-panel__label" htmlFor="cf-name">Name</label>
              <input
                id="cf-name"
                type="text"
                required
                className="contact-form-panel__input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={status === "sending"}
              />
            </div>
            <div className="contact-form-panel__field">
              <label className="contact-form-panel__label" htmlFor="cf-email">Email</label>
              <input
                id="cf-email"
                type="email"
                required
                className="contact-form-panel__input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "sending"}
              />
            </div>
          </div>

          <div className="contact-form-panel__field contact-form-panel__field--full">
            <label className="contact-form-panel__label" htmlFor="cf-message">Message</label>
            <textarea
              id="cf-message"
              required
              rows={3}
              className="contact-form-panel__textarea"
              placeholder="What are you building?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={status === "sending"}
            />
          </div>

          <div className="contact-form-panel__footer">
            <span className="contact-form-panel__hint">
              Opens your mail client — no tracking, no middleman.
            </span>
            <button
              type="submit"
              className="contact-form-panel__submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? (
                <>
                  <span className="contact-form-panel__spinner" />
                  Sending…
                </>
              ) : (
                <>
                  Send message
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                    <path d="M1 6h10M6 1l5 5-5 5" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
