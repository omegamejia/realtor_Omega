---
name: ghl-integration
description: >-
  The single owner of how this site talks to GoHighLevel (GHL) for lead capture:
  Private Integration Token auth, the custom-field folder convention, creating /
  discovering custom fields via the API, mapping site form fields to GHL fields,
  tagging contacts for nurture triggers, and a live connection test. Reused by
  the contact form AND every funnel. Use when someone says "connect GHL", "wire
  up the CRM", "set up custom fields", "the form isn't reaching GoHighLevel",
  "test the GHL connection", or is provisioning fields for a new funnel/form.
# fast, well-defined, structured work
model: sonnet
---

# GHL Integration — the pipe from our site to GoHighLevel

This site is **not** hosted in GoHighLevel. Every page, form, and funnel is a
native page on our own Next.js domain. GHL is used **only through its API** for
lead capture and CRM — the same "native form → GHL contact" pattern already in
[`app/api/lead/route.ts`](../../../app/api/lead/route.ts). This skill owns that
pipe so the contact form and every funnel wire to GHL the same, tested way.

**Never** re-implement GHL calls per page. Forms POST to `/api/lead`; that route
is the one place that talks to GHL. New form types extend the payload, not the
transport.

## What GHL can and can't do via API (verified — don't re-litigate)

- **Contact custom fields CAN be created via API** — `POST /locations/{locationId}/customFields`.
- **Folders for contact fields CANNOT be created via API** — the folder endpoint
  only supports Custom Objects / Company today. **The folder is created by hand.**
- **Placing a contact field into a folder via API (`parentId`) is unconfirmed** —
  attempt it, then verify by reading the field back. Never assume it worked.
- **Writing field values to a contact is fully supported** and already live.
- Standard fields — `firstName`, `lastName`, `email`, `phone` — are **not** custom
  fields. Only create custom fields for the *extra* questions a form asks
  (timeframe, price range, reason, event choice, budget, etc.).

## Auth — Private Integration Token (the chosen method)

1. In GHL: **Settings → Private Integrations → Create** a token for THIS
   sub-account with scopes: **View/Edit Contacts** and **View/Edit Custom Fields**.
2. Store it as `GHL_API_TOKEN` in **two places**, explained in plain terms:
   - **`.env.local`** on their computer — a file that is deliberately never
     uploaded ("a password kept in the safe instead of taped to the window").
   - **A Vercel environment variable** on their project, so the live site can use
     it too. Vercel dashboard → project → Settings → Environment Variables.

   **Getting it into `.env.local` without a terminal command.** Create the file
   with an empty `GHL_API_TOKEN=` line, then open it for them in a plain editor:
   `open -e .env.local` on a Mac, `notepad .env.local` on Windows. They paste the
   token straight after the `=`, with no quotes or spaces, and save. Check it
   landed by confirming the line is no longer empty and starts with `pit-`, and
   never print the value. If it is still empty after they say they saved, they
   almost always edited a different file with the same name, so give the full
   path.

   Never hand them a shell one-liner that pipes the token into the file. It works,
   and in testing an office manager refused to run one, reasonably: it looks
   exactly like the thing they were told never to paste a password into.

   Put the sub-account **Location ID** in `site.config.ts` → `ghl.locationId`.
   The location ID is not secret; the token always is. Never put the token in
   `site.config.ts` or anything committed to git.
3. All calls use: `Authorization: Bearer <token>`, `Version: 2021-07-28`,
   `Content-Type: application/json`.

## The custom-field folder convention

Because folders aren't API-creatable for contacts, the agent makes one by hand,
and we discover its id through a marker field:

1. **Agent creates a folder** in GHL: Settings → Custom Fields → **Add Folder**,
   named to a convention — default `Website — <business short name>` (or
   `Website Funnels` if they prefer). One folder holds every field our site
   creates, so nothing scatters across their CRM.
2. **Agent creates ONE marker field inside that folder** (any text field, e.g.
   `Website Source`). Folder ids aren't visible/copyable in the UI, so this
   marker is how we find the folder: we `GET` all custom fields, read the
   marker's `parentId`, and that's the folder id.
3. From then on, field creation targets that `parentId`.

Record the resolved folder id and every field's returned `id` + `fieldKey` in the
funnel/form config (see funnel-builder) so the form maps inputs → field keys.

## Provisioning fields for a form/funnel

For each **extra** (non-standard) field a form collects:

1. **Discover first.** `GET /locations/{locationId}/customFields`. If a field with
   the intended name already exists (agent may have pre-made it in the folder),
   reuse it — capture its `id`/`fieldKey`. Do not create duplicates.
2. **Create if missing.** `POST /locations/{locationId}/customFields` with
   `{ name, dataType, placeholder?, parentId }`. Pick the right `dataType`
   (`TEXT`, `LARGE_TEXT`, `NUMERICAL`, `PHONE`, `MONETORY`, `SINGLE_OPTIONS`,
   `MULTIPLE_OPTIONS`, `RADIO`, `CHECKBOX`, `DATE`, `EMAIL`…). Send `parentId`.
3. **Verify placement.** Read the field back; if `parentId` didn't stick (see the
   caveat above), the field still works — flag in the setup summary that the agent
   should drag it into the folder once in the UI. Never silently leave this
   ambiguous.
4. **Map it — this step is required, and only the ID works.** Write the returned
   **`id`** into the funnel's `formFields[].ghlFieldId` in `site.config.ts`.

   **VERIFIED AGAINST THE LIVE API (2026-07-30), and this contradicts the docs:**
   contact create accepts `customFields: [{ id, field_value }]` and **silently
   discards** `[{ key, field_value }]`. Both return 201. The key form comes back
   with an empty `customFields` array — the values are gone and nothing errors.

   ```
   { id:  "0diMsiF7aBc7lW8es5GS", field_value: "x" }  → persists
   { key: "contact.accountability_coach", field_value: "x" }  → dropped, no error
   ```

   So `fieldKey` is for human readability only. Never send it. If you skip this
   step the contact is created, the tag applies, and every answer vanishes without
   a single error anywhere — which is exactly why the connection test asserts
   round-trip instead of trusting the status code.

## Tagging — the nurture + delivery trigger

Every capture applies a **tag**, and that tag is what fires GHL automations
(including the thank-you / delivery email — GHL sends the email, we host the page):

- Contact form → tag `contact-form`.
- Funnel → tag `funnel-<slug>`.
- The agent builds the GHL workflow triggered by that tag (deliver the guide/link,
  start nurture). We own the tag + the page; GHL owns the email + nurture.

Keep tags lowercase, hyphenated, stable — they are the contract with GHL workflows.

## The connection test — never call it wired without this

After provisioning, prove the whole pipe end to end:

1. POST a **test contact** through `/api/lead` (or directly) with sample values
   for every field + the tag, using a clearly fake but valid email
   (e.g. `test+<slug>-<stamp>@<domain>`).
2. `GET` the contact back by id/email. **Assert**: it exists, `firstName/email`
   match, each custom field holds its value, and the tag is present.
3. **Delete the test contact** so nothing junk is left in the live CRM. (Deleting
   a contact is destructive — do it only for a contact THIS test just created,
   and confirm the id first.)
4. Report a clear PASS/FAIL table: field-by-field, tag, folder placement.

The connected GHL MCP tools (`ghl_check_fields`, `ghl_find_field`,
`ghl_list_custom_values`, `ghl_update_field`) can inspect/verify fields during
this step — use them to confirm rather than trusting the write's 200.

## Standalone vs. integrated

- **Integrated** (inside this seed site): `locationId` in `site.config.ts`, token
  in `.env.local` + Vercel, fields recorded in the funnel config. Inherits everything.
- **Standalone** (someone else's existing site): same mechanism, but the token +
  `locationId` + folder live in that project's own small config. The transport
  (`/api/lead`), folder convention, provisioning, tagging, and connection test are
  identical — that's the whole point of centralizing them here.

## Hard rules

- The GHL token is a secret: `.env.local` + Vercel environment variables only.
  Never committed to git, never in `site.config.ts`, never in a page, never pasted
  into chat. If it ever does get committed, it must be revoked in GHL and reissued
  — a token in git history is a token that leaked.
- Never create a custom field for data a standard contact field already holds.
- Never duplicate a field — discover before you create.
- Never report "connected" without a passing connection test.
- Tags are a stable contract — don't rename a live funnel's tag without updating
  the GHL workflow that listens for it.
