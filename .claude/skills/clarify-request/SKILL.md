---
name: clarify-request
description: Turn the user's short, informal or mixed-up request into a clear brief before acting. Use at the start of every non-trivial request in this project — especially when it is casual, run-on, has typos, mixes several asks, or says "fix this / make it better / do it" without specifics. Not needed for one-line factual questions.
---

# Clarify Request

The user writes quickly and casually (often several asks in one message, loose wording,
typos). Your job is to understand it the way a good teammate would — not to make them
rewrite it.

## Steps

1. **Read the whole message, then the context.** Check `CLAUDE.md` and the files or
   artifact the request points at (open file, recent changes) before deciding what it means.

2. **Write a short brief at the top of your reply** (2–5 lines, plain words):
   - **Goal:** what the user wants to end up with, in one sentence.
   - **Scope:** which pages/files/parts are in, and anything clearly out.
   - **Done when:** how both of you will know it's finished (e.g. "visible in `npm run dev`", "build passes").
   If the message holds several asks, number them and handle them in that order.

3. **Fill gaps with sensible defaults, don't interrogate.** Pick the option that fits the
   project's conventions and say which you picked in a few words. Ask a question only when
   the answer would change the work substantially *and* you can't infer it — then ask one
   clear question, with your recommended answer first.

4. **Then do the work.** The brief is a lead-in, not a substitute for acting.

5. **Teach lightly (optional, at most one line).** If a missing detail caused real guessing,
   end with one short tip like: "Next time, naming the page (e.g. Students) saves a step."
   Never lecture, never rewrite their whole message back to them.

## Example

User: "the dashboard look weird on phone and also the button color make it blue or something idk"

Reply opens with:
> **Goal:** fix the dashboard layout on phone widths, and try a blue accent on its buttons.
> **Scope:** `Dashboard.jsx` + shared button styles; other pages untouched.
> **Done when:** dashboard has no sideways scroll at 390px wide and buttons show the new color in `npm run dev`.
> Note: blue would break the SJC orange theme in CLAUDE.md, so I'll apply it to the dashboard only and show you before rolling it out.
