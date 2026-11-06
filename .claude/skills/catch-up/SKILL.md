---
name: catch-up
description: Show the owner what their site could be doing and isn't (the items `npm run catchup` lists, such as reporting, pixels, heatmaps and the daily articles), then switch on whichever ones they pick. Use when someone says "catch me up", "what am I missing", "what's new", "did I miss any updates", "what else can my site do", "am I using everything", or after an engine update has landed.
model: sonnet
---

# Catch up

## What this is for

`launch:check` answers *"is anything here wrong?"*. This answers the other
question: ***"is anything here switched off?"***, and nothing else asks it.

The gap is structural. An engine update ships **files**. Some are complete the
moment they land: canonical tags and social previews started working on every
site the day they arrived and nobody had to know. Others arrive **inert**:
reporting, pixels, heatmaps, and whatever else `npm run catchup` lists for this
kind of business. Every one of those needs a person to create an account, paste
an ID, or set a secret before a single line of the shipped code does anything.

So an owner can accumulate six months of improvements and be sitting on three
switched-off features with no way to find out. The gate won't say anything,
because nothing is broken.

## How to run it

```bash
npm run catchup
```

It reads the config and content and reports three groups: already working,
switched off, and *cannot check from here*. It changes nothing. The items it
checks live in `scripts/capabilities.mjs`, which is this seed's own file:
each kind of business has its own list.

## The conversation

**Lead with upside, never with a list of chores.** These are opportunities the
owner already paid for and hasn't collected. "Three things your site can do
that it isn't" beats "you have 9 issues."

1. **Run it and read the output yourself first.** Decide which two or three
   actually matter for this owner right now. Do not read every item aloud.
2. **Lead with the one with the best ratio of value to effort.** Usually that
   is analytics or the pixel: ten free minutes, and without them every
   marketing decision after today is a guess.
3. **Name what it gives them, not what the field is called.** The script's
   wording is written for reading aloud, so use it.
4. **Say the cost honestly, including the slow ones.** Each item's effort line
   says how long it really takes, including anything that waits on a third
   party's approval. An owner who finds that out afterwards stops trusting the
   rest.
5. **Offer, then stop.** They pick. Route to the skill named in "To do it".
6. **Write down what they declined** in `content/OPEN-ITEMS.md`, with the word
   "declined". The script reads that back and stops offering it. Nagging is how
   this becomes something they avoid running.

## The items that need more than a mention

**Tracking.** Switching on a pixel changes what the privacy policy has to
disclose, and `launch:check` fails a site whose policy never names a configured
vendor. Do both in the same sitting or neither. See the section on advertising
tags and analytics in `.claude/rules/legal-compliance.md`, and do not tell a
small business it is subject to a privacy law that rule says it is not.

**Anything that is real writing.** Some items are not a switch but work: local
detail for area pages, the owner's own voice. They are usually the ones that
decide whether the site ranks. Don't bury them under the ten-minute items, and
don't pretend they are quick.

**Where the leads go.** The script cannot read environment variables, so it
never claims the CRM is broken. If the owner has never seen a test lead arrive,
run `npm run test:ghl` and find out. A site that accepts a form and drops the
lead looks perfect from the outside: it returns a thank-you either way.

## What it deliberately does not do

- **It never fixes anything.** Every item is the owner's decision: their money,
  their accounts, their clients' data.
- **It never reports a declined item as missing.**
- **It never guesses at what it cannot see.** GitHub secrets and host
  environment variables are reported as "cannot check from here", never as
  "missing". A confident wrong answer about the CRM is worse than no answer.

## After an engine update

Run this immediately after. An update's changelog describes what changed in
the *engine*; this describes what is missing from *their site*, which is the
only one of the two they can act on.
