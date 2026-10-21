# Questions people actually ask while building this

Written for someone who does not work in software. Every question on this page was
asked out loud by a real agent partway through their own build, so if you are
wondering it, you are not behind — you are in good company.

`docs/TROUBLESHOOTING.md` is the page for when something looks **broken**. This
page is for when nothing is broken and you want to know what is going on.

**You can ask Claude any of this directly, in your own words, at any point.** It
has this page and will answer from it.

---

## Your existing website

### "Is this going to replace the website I already have?"

**No. It cannot, and it will not.**

Your current site lives on somebody else's platform, behind somebody else's login.
Claude has no access to it. Nothing that happens here reaches it.

What is actually happening: you are building a **brand new site, from scratch,
alongside the one you have**. Yours keeps running the entire time. Your old site
does not change, does not go down, and does not go anywhere until the day you
personally decide to do something about it — and that day is weeks away, not
today.

### "Then why is it asking about my old site?"

Two reasons, and both save you work:

1. **Facts.** Your bio, your license number, your areas, your team, your
   testimonials — all of that is already written on your old site. Reading it means
   you do not have to type it again.
2. **Look.** If you like how your current site looks, say so and the new one can
   match it: same colours, same feel. If you would rather start clean, say that
   instead. Both are good answers.

When Claude asks whether you want a "clean slate," it is asking about the **look
of the new site only**. It is never asking permission to touch the old one.

### "I have two websites — which one do I give it?"

Tell Claude about both and say which one describes you best. It will use that one
and leave the other alone. Do not let it blend the two.

### "Mine is only my brokerage page — does that count?"

Yes. An eXp page, a Bold Trail site, a Carrot site, a Mashore Method site, a
brokerage bio — all of those are real answers and all of them are useful. Answering
"yes, but it's only my brokerage page" does not commit you to anything, and it
does **not** mean your new site will be hosted there.

---

## Your domain

### "Do I need my domain for this?"

**Not yet, and not for a while.** This is the single most common thing people
worry about too early.

Everything you are about to build happens on your own computer. A domain — your
`yourname.com` address — is the **last** step, long after the site is finished and
you are happy with it.

### "What does 'building it locally' mean?"

It means your site lives right here on your computer and nowhere else.

It looks like a real website. It works like a real website — you click around it in
your browser exactly the way a visitor would, every page, every link, every form.
The only difference is that **you are the only person on earth who can see it.**

That makes it the best possible place to play. There is nothing to break, nobody is
watching, and there are no consequences to trying something and hating it. When you
love it, you push it out of the nest and give it an address.

### "I bought a domain through [platform] and it says using it will wipe out what I have running"

Then do not use that one right now — and more to the point, **do not make that
decision today.** You have not needed a domain for anything yet.

When you do get there, you have options: a brand new domain, or your existing one
moved across carefully. Switching a live domain is a proper migration that protects
your email and keeps your old links working, and Claude has a whole process for it.
Say "help me with my domain" when you are ready.

### "Will pointing my domain at the new site break my current site?"

Not by accident, and not until you do it deliberately. Your old site keeps running
right up to the moment you switch, and the switch itself takes minutes and is
reversible.

---

## Publishing and Vercel

### "What is Vercel, and how is it different from WordPress?"

GitHub holds your website's files, like a filing cabinet. **Vercel is the building
with the lights on** — it runs your site 24/7 so people can visit it.

WordPress is a place where you drag boxes around to build a page, and you pay for
that convenience. Here you do not drag anything: you say what you want in plain
English and it gets built. Vercel keeps it running.

### "Do I have to create a Vercel account? Does it cost money?"

You will need an account, and **the free tier is genuinely enough** for everything
you are doing now and for a good while after. Do not pay for anything yet.

### "Do I need to import this into Vercel? I'm not ready to publish."

No. Nothing publishes itself, and nothing goes public until you say so. Connecting
Vercel early is fine but it is not required, and it does not make your site
visible to anyone.

### "Where will my site actually live?"

Three stages, in order:

1. **On your computer** — while you build it. Only you can see it.
2. **On a free practice address** (something like `yoursite.vercel.app`) — so you
   can send it to a friend or look at it on your phone. Real, but not your brand.
3. **On your own domain** — when you are ready and only then.

---

## Teams and partners

### "My spouse/partner and I are both here — do we each build one?"

**No. One business, one website.** Only one of you needs to do this. Build it
together on one person's computer, on one account, and put both of you on it as
team members — the site gives every team member their own page.

Two half-finished sites for one business is the worst outcome available, and
splitting the work between you is the usual way people end up there.

### "My team name and my personal name are different — which do I use?"

Whatever your **Google Business Profile** says. That is the name Google already has
on record for you, and matching it everywhere is worth more than picking the name
you like best. See the Google section below.

---

## Google Business Profile

### "My Google listing has a space in my name and I don't write it that way"

Use whatever Google has. Small differences like a space, `&` versus `and`, or
`Realty` versus `Real Estate` make Google and AI assistants less certain that all
your listings are the same business — and certainty is the thing you are buying.
It is not worth risking your listing to fix a space, but where you have the choice,
match Google.

### "My Google listing has an old office address I don't use any more"

Common, and less of a problem than it feels.

Your site links its map to your **Google Business Profile itself**, not to a street
address, and by default it does not display an address at all. What that link does
is tell Google and every AI assistant *this website and this business are the same
thing* — which is the part that helps you.

If the address is in the same town you still work in, leaving it alone is usually
fine. If it is in a different town, or if your license or bar registration requires
a specific address, **tell Claude that** — it will keep the site consistent with
your licensing record and flag anything that conflicts rather than guessing.

### "I don't have a Google Business Profile at all"

The site works without one. Say so and Claude will skip the map link and note it as
something worth setting up later — it is one of the higher-value things you can do
for local ranking.

---

## While it is building

### "It's been installing Node for ages. Am I going to lose my work?"

No. Installs can take a long time on a slow connection, and that is normal.

**You can close everything and come back.** Nothing is lost, nothing has to be
restarted, and this is not a process you have to finish in one sitting. Say "let's
pick up where we left off" next time.

### "A black window opened with a bunch of C:\ file paths"

That is the installer doing its job. It is showing you which files it is putting
where. Leave it alone and let it finish.

### "It's asking if I want a prompt to start a fresh session. Do I?"

**Keep going in the session you are in.** If Claude offers this mid-setup, say
"no, let's keep going here."

There is a real version of this later: when a conversation gets very long, you will
see a meter turn red, and *then* it is worth saying **"create a handoff file and a
prompt so I can continue this in a new session."** That is deliberate and it keeps
everything you have done. Doing it early costs you your momentum.

### "Is my work actually being saved anywhere?"

It should be saved into your own private copy on GitHub as you go. If you want to
be sure — and it is a reasonable thing to want to be sure about — say:

> "Make sure everything we've done is backed up in my own GitHub repository."

### "How long does all of this take?"

Longer than one sitting, and that is expected. You will get to something real and
good-looking early on, then keep improving it. You can stop and start whenever you
like.

---

## Listings and MLS

### "Do I still need an IDX provider?"

Two different things:

- **Your own listings** — yours, and they go on the site directly. No provider, no
  fee, and they are richer than anything a feed would give you.
- **Every other home for sale in your area** (the searchable map of the whole
  market) — that is IDX, and yes, that still comes from a provider with a monthly
  fee. If you already have one, it drops into this site. If you do not, the site
  works fine without it and you can add it any time.

You do not need to decide this during setup.

Two things worth knowing before you buy one:

- **It will not help you show up in Google.** The search lives in a frame that
  belongs to your provider, so Google credits that content to them. What gets you
  found is the pages we wrote for you. IDX is there so somebody who lands on
  those pages and wants to browse the whole market never has to leave your site.
- **It takes days to weeks, and most of that is not us.** Your broker signs the
  MLS data licence, the MLS approves the vendor and your domain, and then the
  provider gives us a link. Pasting the link in takes two minutes.

The whole procedure, step by step, is in **`docs/IDX-SETUP.md`**.

---

## Still wondering something?

**Ask Claude.** In your own words, at any point, however basic it feels. If the
explanation does not land, say "explain that differently" and you will get another
angle. No question here is too small, and the ones on this page are only here
because somebody asked them first.
