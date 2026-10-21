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
  let payload: Record<string, string>;
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

  const firstName = clampStr(payload.firstName, 80);
  const lastName = clampStr(payload.lastName, 80);
  const email = clampStr(payload.email, 254);
  const phone = clampStr(payload.phone, 20);
  const message = clampStr(payload.message, 2000);
  const source = clampStr(payload.source, 120);
  const tag = clampStr(payload.tag, 60);

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
    });
    return NextResponse.json({ ok: true, mode: "seed" });
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
        phone: phone || "",
        source: source || "Website contact form",
        // Funnel leads are tagged so GHL can route them into the right nurture.
        tags: tag ? [tag] : [],
        // customFields by key. The ghl-integration skill provisions matching
        // fields in GHL and records their keys; unmapped extras are best-effort.
        customFields: [
          ...(message ? [{ key: "message", field_value: message }] : []),
          ...Object.entries(fields).map(([key, field_value]) => ({
            key,
            field_value,
          })),
        ],
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

    return NextResponse.json({ ok: true, mode: "live" });
  } catch (err) {
    console.error("[lead] GHL request failed:", err);
    return NextResponse.json(
      { error: "Could not save your message. Please try again." },
      { status: 502 }
    );
  }
}
