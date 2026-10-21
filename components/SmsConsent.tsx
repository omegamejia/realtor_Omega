"use client";

import { site } from "@/site.config";

/**
 * SMS consent checkbox.
 *
 * Any form that collects a phone number needs this before anyone texts that
 * number. TCPA governs the consent itself; A2P 10DLC governs whether carriers
 * will even deliver the message. Texting a non-consented number gets filtered by
 * the carrier and can flag the sending sub-account — so this protects the agent's
 * ability to send at all, not just their legal position.
 *
 * Requirements this satisfies:
 *  - never pre-ticked (an unchecked box is the only real consent)
 *  - names who is contacting them
 *  - states that rates apply and frequency varies
 *  - gives the opt-out keyword
 *  - links the privacy policy and terms
 *  - required ONLY when a phone number was actually entered, so a visitor who
 *    leaves phone blank is never blocked by an irrelevant checkbox
 *
 * The exact wording shown is submitted with the lead and recorded against the
 * contact, because "we had consent" is only defensible if you can say what they
 * agreed to and when.
 */

/** The text shown to the visitor. Submitted verbatim so the record matches. */
export const CONSENT_TEXT = `I agree to receive text messages from ${site.agent.brokerage || site.brand.logoText} at the number provided. Message and data rates may apply. Message frequency varies. Reply STOP to opt out or HELP for help.`;

export function SmsConsent({ required }: { required: boolean }) {
  return (
    <label className="flex items-start gap-3 pt-1 text-xs leading-relaxed text-[color:var(--fg-muted)]">
      <input
        type="checkbox"
        name="smsConsent"
        value="yes"
        required={required}
        className="field-choice mt-0.5 shrink-0"
      />
      <span>
        {CONSENT_TEXT}{" "}
        See our{" "}
        <a href="/privacy" className="underline hover:text-[color:var(--brand-ink)]">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="/terms" className="underline hover:text-[color:var(--brand-ink)]">
          Terms
        </a>
        .
      </span>
    </label>
  );
}
