"use client";

import { useState } from "react";
import type { Funnel, FunnelField } from "@/site.config";
import { Check } from "@/components/Icons";

/**
 * Funnel opt-in / RSVP form. Captures name/email/phone plus any extra questions
 * (funnel.formFields) and posts to /api/lead, tagged so GHL can nurture/deliver.
 * Extra answers are sent under `fields` — the ghl-integration skill maps them to
 * GHL custom fields once wired; until then /api/lead logs them (seed mode).
 */
export function FunnelForm({ funnel }: { funnel: Funnel }) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  const isEvent = funnel.goal === "event";
  const extra = funnel.formFields ?? [];
  const tag = funnel.tag ?? `funnel-${funnel.slug}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const form = e.currentTarget;
    const all = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    // Split standard contact fields from the extra questions.
    const { firstName, lastName, email, phone, company } = all;
    // Key each answer by its GHL custom-field key when ghl-integration has
    // provisioned one; fall back to the form field name in seed mode. Without
    // this the raw camelCase name is sent and never matches a real GHL field.
    const fields: Record<string, string> = {};
    for (const f of extra) {
      if (all[f.name]) fields[f.ghlFieldKey || f.name] = all[f.name];
    }

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          company, // honeypot — dropped server-side
          fields,
          source: `${isEvent ? "Event RSVP" : "Lead magnet"}: ${funnel.title}`,
          tag,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong.");
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-cta)] text-[color:var(--on-brand)]">
          <Check size={24} aria-hidden />
        </div>
        <p className="mt-3 text-lg font-semibold text-[color:var(--fg)]">
          {isEvent ? "You're registered!" : "You're all set!"}
        </p>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{funnel.thankYou}</p>
        {!isEvent && (
          <a
            href={`/free/${funnel.slug}/guide`}
            className="mt-5 inline-flex items-center rounded-md bg-[var(--brand-cta)] px-6 py-3 text-sm font-semibold text-[color:var(--on-brand)] hover:opacity-90"
          >
            Read your guide now
          </a>
        )}
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
        <TextField label="First name" name="firstName" required />
        <TextField label="Last name" name="lastName" />
      </div>
      <TextField label="Email" name="email" type="email" required />
      <TextField label="Phone" name="phone" type="tel" />

      {extra.map((f) => (
        <ExtraField key={f.name} field={f} />
      ))}

      {status === "error" && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex w-full items-center justify-center rounded-md bg-[var(--brand-cta)] px-6 py-3 text-sm font-semibold text-[color:var(--on-brand)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : funnel.buttonText}
      </button>
      <p className="text-center text-xs text-[color:var(--fg-subtle)]">
        {isEvent ? "Free to attend. We'll never share your info." : "No spam. Unsubscribe anytime."}
      </p>
    </form>
  );
}

// One shared definition lives in globals.css (.field) — change it there and every
// input on the site follows. Meets the 44px touch-target floor.
const inputClass = "field";

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-[color:var(--fg-muted)]">
      {label} {required && <span className="text-[color:var(--accent-text)]">*</span>}
    </label>
  );
}

function TextField({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label label={label} required={required} />
      <input type={type} name={name} required={required} className={inputClass} />
    </div>
  );
}

function ExtraField({ field }: { field: FunnelField }) {
  const { name, label, type, options = [], required } = field;
  if (type === "textarea") {
    return (
      <div>
        <Label label={label} required={required} />
        <textarea name={name} required={required} rows={3} className={inputClass} />
      </div>
    );
  }
  if (type === "select") {
    return (
      <div>
        <Label label={label} required={required} />
        <select name={name} required={required} defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose one…
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (type === "radio") {
    return (
      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-[color:var(--fg-muted)]">
          {label} {required && <span className="text-[color:var(--accent-text)]">*</span>}
        </legend>
        <div className="flex flex-wrap gap-4 pt-1">
          {options.map((o, i) => (
            <label key={o} className="field-choice-row text-sm text-[color:var(--fg)]">
              <input
                type="radio"
                name={name}
                value={o}
                required={required && i === 0}
                className="field-choice"
              />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return <TextField label={label} name={name} required={required} />;
}
