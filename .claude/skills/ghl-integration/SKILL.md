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
2. Store it in Doppler as `GHL_API_TOKEN` (never in code or `.env` committed to
   git — see the global secrets rule). Put the sub-account **Location ID** in
   `site.config.ts` → `ghl.locationId`.
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
4. **Map it — this step is required, not bookkeeping.** Write the returned
   `fieldKey` back into the funnel's `formFields[].ghlFieldKey` in
   `site.config.ts`. `FunnelForm` sends each answer keyed by `ghlFieldKey` when
   it's set and falls back to the raw form field name when it isn't — and a raw
   camelCase name (`learningGoal`) will **not** match a real GHL field key
   (`contact.learning_goal`). Skip this and the contact is created but the answers
   land nowhere.

   The runtime posts `customFields: [{ key, field_value }]` (see
   `app/api/lead/route.ts`). GHL v2 accepts either `key` or `id`; this pipe uses
   `key`. If you change one side, change both — they are a contract.

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
  in Doppler, fields recorded in the funnel config. Inherits everything.
- **Standalone** (someone else's existing site): same mechanism, but the token +
  `locationId` + folder live in that project's own small config. The transport
  (`/api/lead`), folder convention, provisioning, tagging, and connection test are
  identical — that's the whole point of centralizing them here.

## Hard rules

- The GHL token is a secret: Doppler only, never committed, never in a page.
- Never create a custom field for data a standard contact field already holds.
- Never duplicate a field — discover before you create.
- Never report "connected" without a passing connection test.
- Tags are a stable contract — don't rename a live funnel's tag without updating
  the GHL workflow that listens for it.
