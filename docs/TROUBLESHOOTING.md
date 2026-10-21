# When something goes wrong

Written for someone who does not work in software. Nothing here is your fault, and
none of it will break your website — everything below is recoverable.

**The fastest fix for almost anything: paste the error into Claude and say
"this happened, what do I do?"** It can read the message, work out what it means,
and usually fix it for you. The rest of this page is for when you would rather
understand it yourself.

**Nothing broken, only wondering?** `docs/FAQ.md` is the page for that — will this
replace my existing website, do I need my domain yet, what does "locally" mean, do
my partner and I each build one, what is Vercel.

---

## "It says the site is NOT READY TO LAUNCH"

**This is not an error.** It is the safety net working.

Your site refuses to go live while it still contains placeholder text or unwritten
pages. You will see something like:

```
✗ NOT READY TO LAUNCH — 1931 issue(s).
   • 51 page(s) have not been written yet
   • 157 placeholder value(s) still need your real details
```

That looks alarming and is completely normal on a new site. It is a to-do list, not
a fault. Say **"keep setting up my site"** and Claude works through it with you.

It will stop saying this when the site is genuinely finished, which is exactly the
point — nothing half-built can go live by accident.

---

## "Port 3000 is already in use" / "address already in use"

Something else is already running on the address your site wants to use. Usually a
copy of your own site that did not shut down properly.

**Fix:** close other terminal windows, or run it on a different address:

```bash
PORT=3001 npm run gate
```

---

## "command not found: npm" or "command not found: node"

**Try this first: ask Claude to fix it.** Say *"node isn't installed, can you set
it up?"* It can install it for you without needing your password. The steps below
are the manual route if that will not work.

Node.js is not installed, or was installed after you opened your terminal.

**Fix:** install the **LTS** version from [nodejs.org](https://nodejs.org), then
**fully quit and reopen** Claude Code. Programs only notice new tools when they
start up.

To confirm it worked:

```bash
node --version
```

You want to see `v20` or higher.

---

## "npm install" fails, or the site will not start

Usually a partial or interrupted download.

**Fix:** delete what was downloaded and get it again.

```bash
rm -rf node_modules package-lock.json
npm install
```

On Windows, if `rm` is not recognized, delete the `node_modules` folder and the
`package-lock.json` file by hand, then run `npm install`.

This is completely safe. Those files are downloaded, never written by you.

---

## The page in my browser is broken or blank

Almost always a stale preview rather than a real problem.

**Fix, in order:**

1. **Hard refresh** the page — `Cmd+Shift+R` on Mac, `Ctrl+Shift+R` on Windows.
2. If that does not do it, ask Claude to **restart the preview**.
3. If you see `__webpack_modules__ is not a function`, the preview got confused.
   Ask Claude to "clear the build cache and restart" — it deletes a temporary
   folder and starts fresh. Nothing of yours is lost.

---

## Vercel says the build failed

Your site did not publish. The live site keeps showing the last working version, so
visitors never see a broken page — you have time to fix it.

**Fix:** open the failed deployment in Vercel, copy the red error text, and paste it
to Claude. Build errors are specific and usually a one-line fix.

---

## "I made my copy on GitHub, but there is no folder to open"

This is the most common place to get stuck, and nothing is broken — there is just
one step missing.

**The short version: ask Claude to do it.** Say *"connect my GitHub and clone my
site onto my computer."* It will ask permission once, then handle the rest. The
manual route below still works and is here in case that will not cooperate.

Clicking **"Use this template"** created your website **on github.com**. It did not
put anything on your computer yet. Those are two different places, and Claude can
only work on files that are actually on your machine.

*GitHub is a filing cabinet in an office across town. Your files are safely in
there — but to work on one, you need a copy on your own desk.*

**The fix — about two minutes:**

1. Install **GitHub Desktop** from [desktop.github.com](https://desktop.github.com)
   if you have not already, and sign in with your GitHub account.
2. **File → Clone repository.**
3. Pick your repository from the list.
4. Note the **Local path** it shows — that is the folder it will create.
5. Click **Clone**.

Now open that folder in Claude Code. ("Clone" only means "make me a copy I can work
on." It changes nothing on GitHub, and you can do it again any time.)

If your repository is not in the list, click **Sign in** inside GitHub Desktop, or
check you are signed into the same GitHub account you used to make the copy.

## "I do not see the 'Use this template' button"

Either you are not signed in to GitHub, or you have not been granted access to the
template yet.

**Fix:** sign in first. If it is still missing, ask KMC to add you.

---

## The chat bubble says it cannot answer

The chat widget needs its own Claude API key, and it runs in a limited mode without
one. It will point visitors to your phone number and contact page instead of
answering — so nothing is broken, it is just quieter.

**Fix:** ask Claude to "set up the chat assistant" and it will walk you through
getting a key. See [CHAT-COSTS.md](CHAT-COSTS.md) for what it costs.

---

## My contact form does not seem to reach my CRM

If GoHighLevel is not connected yet, submissions are accepted and logged but not
sent anywhere. That is the expected behavior before setup, not a failure.

**Fix:** ask Claude to "test the GHL connection." It runs a real end-to-end check —
creates a test contact, confirms every field arrived, and deletes it — and tells
you exactly what is wrong if anything is.

---

## I think I broke something

You almost certainly did not, and it is almost certainly recoverable. Every version
of your site is saved automatically, so nothing is ever truly lost.

Tell Claude what you were doing when it went wrong. If you need to go back:

> "Undo my last change" or "put the site back the way it was this morning"

---

## Still stuck

Tell Claude:

> "Something is wrong and I do not know what. Here is what I see: …"

Paste in whatever is on your screen, including error text. That is genuinely the
most useful thing you can do, and there is no wrong way to describe it.
