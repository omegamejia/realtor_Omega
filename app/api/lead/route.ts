import { NextResponse } from "next/server";
import { site } from "@/site.config";
import {
  clientIp,
  isRateLimited,
  validEmail,
  validPhone,
  clampStr,
} from "@/lib/ratelimit";

/**
 * POST /api/lead
 *
 * Receives a contact-form submission and forwards it into GoHighLevel as a
 * contact. This is the "native form → GHL via API" pattern.
 *
 * Auth: the GHL token is read from the GHL_API_TOKEN environment variable
 * (never hardcoded). The location ID comes from site.config.ts.
 *
 * If the token/location aren't set yet (seed state), it logs the lead and
 * returns success so the form is fully clickable during local testing.
 */
export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot: a hidden "company" field real users never see. Bots fill it.
  // Silently accept and drop it so the bot gets a "success" and moves on,
  // and nothing reaches GHL.
  if (typeof payload.company === "string" && payload.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  // Per-IP rate limit (durable when Upstash is configured — see lib/ratelimit).
  if (await isRateLimited(`lead:${clientIp(req)}`, 5, 60)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in a minute." },
      { status: 429 }
    );
  }

  const firstName = clampStr(String(payload.firstName ?? ''), 80);
  const lastName = clampStr(String(payload.lastName ?? ''), 80);
  const email = clampStr(String(payload.email ?? ''), 254);
  const phone = clampStr(String(payload.phone ?? ''), 20);
  const message = clampStr(String(payload.message ?? ''), 2000);
  const source = clampStr(String(payload.source ?? ''), 120);
  const tag = clampStr(String(payload.tag ?? ''), 60);

  // SMS consent. "We had consent" is only defensible if you can show WHAT they
  // agreed to and WHEN, so the exact wording shown on the page is submitted with
  // the lead and written to the contact's timeline as a timestamped record.
  // TCPA governs the consent; A2P 10DLC decides whether carriers deliver at all.
  const smsConsent = payload.smsConsent === true || payload.smsConsent === "yes";
  const consentText = clampStr(String(payload.consentText ?? ''), 500);

  // Extra funnel questions (funnel.formFields). Arrive as { fieldName: answer }.
  // Clamped defensively. Wired to real GHL custom fields by the ghl-integration
  // skill; until then they're captured (seed-mode logs them).
  const rawFields =
    payload.fields && typeof payload.fields === "object" ? payload.fields : {};
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawFields as Record<string, unknown>).slice(0, 20)) {
    const key = clampStr(k, 60);
    const val = clampStr(typeof v === "string" ? v : String(v ?? ""), 1000);
    if (key && val) fields[key] = val;
  }

  if (!firstName || !validEmail(email)) {
    return NextResponse.json(
      { error: "A first name and a valid email are required." },
      { status: 422 }
    );
  }
  if (!validPhone(phone)) {
    return NextResponse.json(
      { error: "That phone number doesn't look right." },
      { status: 422 }
    );
  }

  const token = process.env.GHL_API_TOKEN;
  const locationId = site.ghl.locationId;
  const configured =
    token && locationId && !locationId.startsWith("[");

  // Seed / local mode: no GHL wired yet. Log and succeed so the UX is testable.
  if (!configured) {
    console.log("[lead] (GHL not configured — seed mode) captured:", {
      firstName,
      lastName,
      email,
      phone,
      message,
      tag,
      fields,
      smsConsent,
    });
    return NextResponse.json({ ok: true, mode: "seed" });
  }

  // A phone number with no consent must never reach the CRM, because the CRM is
  // what sends the texts. Keep the lead (the email is still valuable) and drop
  // the number rather than creating a contact nobody is allowed to message.
  const phoneForCrm = smsConsent ? phone : "";
  if (phone && !smsConsent) {
    console.warn(
      "[lead] phone supplied without SMS consent — number withheld from CRM. Texting it would breach TCPA and risk carrier filtering."
    );
  }

  // Any extra answer without a provisioned GHL field ID cannot be written.
  // Log it loudly rather than dropping it silently.
  const unmapped = Object.keys(fields).filter((k) => !/^[A-Za-z0-9]{15,}$/.test(k));
  if (unmapped.length) {
    console.warn(
      `[lead] ${unmapped.length} answer(s) have no GHL field ID and will NOT be saved: ${unmapped.join(", ")}. Run the ghl-integration skill to provision them.`
    );
  }

  // Live mode: create the contact in GoHighLevel (API v2).
  try {
    const res = await fetch("https://services.leadconnectorhq.com/contacts/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId,
        firstName,
        lastName: lastName || "",
        email,
        phone: phoneForCrm,
        source: source || "Website contact form",
        // Funnel leads are tagged so GHL can route them into the right nurture.
        // The consent tag is what a GHL workflow should gate SMS sends on.
        tags: [...(tag ? [tag] : []), ...(smsConsent ? ["sms-consent"] : [])],
        // customFields keyed by GHL field ID. VERIFIED against the live API:
        // contact create accepts `id` and SILENTLY DISCARDS `key` — it returns
        // 201 either way, so sending keys loses every answer without an error.
        // ghl-integration provisions the fields and records their IDs into
        // site.config.ts; anything without an ID cannot be mapped and is logged
        // rather than sent, so it is visible instead of silently lost.
        customFields: Object.entries(fields)
          .filter(([id]) => /^[A-Za-z0-9]{15,}$/.test(id))
          .map(([id, field_value]) => ({ id, field_value })),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[lead] GHL error:", res.status, detail);
      return NextResponse.json(
        { error: "Could not save your message. Please try again." },
        { status: 502 }
      );
    }

    // The visitor's actual message goes in as a contact NOTE, not a custom field.
    // Notes are GHL's primitive for freeform text and show on the contact
    // timeline where an agent will actually read them. Verified against the live
    // API: POST /contacts/{id}/notes returns 201 and the body round-trips.
    //
    // A failed note never fails the request: the contact and the tag are already
    // saved, and losing the lead entirely because a note failed would be worse.
    // It logs loudly instead, because a silently-dropped message is exactly the
    // bug this replaced.
    const notes: string[] = [];
    if (message) notes.push(message);
    if (smsConsent) {
      notes.push(
        `SMS CONSENT GIVEN ${new Date().toISOString()}\nVia: ${source || "website form"}\nExact wording shown to the visitor:\n"${consentText || "(not recorded)"}"`
      );
    }

    if (notes.length) {
      const created = await res.json().catch(() => null);
      const contactId = created?.contact?.id ?? created?.id;
      if (!contactId) {
        console.error(
          "[lead] contact created but no id returned; note(s) NOT saved:",
          notes.join(" | ").slice(0, 200)
        );
      } else {
        for (const body of notes) {
          try {
            const noteRes = await fetch(
              `https://services.leadconnectorhq.com/contacts/${contactId}/notes`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  Version: "2021-07-28",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ body }),
              }
            );
            if (!noteRes.ok) {
              console.error(
                `[lead] contact ${contactId} saved but a note FAILED (HTTP ${noteRes.status}): ${body.slice(0, 120)}`
              );
            }
          } catch (err) {
            console.error(`[lead] note threw for contact ${contactId}:`, err);
          }
        }
      }
    }

    return NextResponse.json({ ok: true, mode: "live" });
  } catch (err) {
    console.error("[lead] GHL request failed:", err);
    return NextResponse.json(
      { error: "Could not save your message. Please try again." },
      { status: 502 }
    );
  }
}
