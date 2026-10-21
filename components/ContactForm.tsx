"use client";

import { useState } from "react";
import { Check } from "@/components/Icons";
import { SmsConsent, CONSENT_TEXT } from "@/components/SmsConsent";

/**
 * ContactForm — native form, styled by us, submitted to our own /api/lead
 * route which forwards the lead into GoHighLevel. This is the "build the form
 * ourselves, send everything to GHL" pattern: full control, testable, no
 * hunting for embed codes.
 */
export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle"
  );
  const [error, setError] = useState<string>("");
  // Consent is only required once a phone number is present, so a visitor who
  // leaves it blank is never blocked by a checkbox that does not apply to them.
  const [hasPhone, setHasPhone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          smsConsent: data.smsConsent === "yes",
          consentText: data.smsConsent === "yes" ? CONSENT_TEXT : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong.");
      }
      setStatus("ok");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Check size={24} aria-hidden />
        </div>
        <p className="mt-3 text-lg font-semibold text-neutral-900">Thanks, got it!</p>
        <p className="mt-1 text-sm text-neutral-600">
          Your message is on its way. I&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot — off-screen; real users never fill it, bots do (dropped server-side). */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" required />
        <Field label="Last name" name="lastName" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" required />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          onChange={(e) => setHasPhone(e.target.value.trim().length > 0)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[color:var(--fg-muted)]">
          How can I help?
        </label>
        <textarea
          name="message"
          rows={4}
          className="field"
          placeholder="Buying, selling, or just have a question…"
        />
      </div>

      <SmsConsent required={hasPhone} />

      {status === "error" && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex w-full items-center justify-center rounded-md bg-[var(--brand-cta)] px-6 py-3 text-sm font-semibold text-[color:var(--on-brand)] transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[color:var(--fg-muted)]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        onChange={onChange}
        className="field"
      />
    </div>
  );
}
