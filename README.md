---
title:
layout: home
permalink: /
---

![promo-image](assets/images/promo-marquee.png)

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/alexwforsythe)

- [ ] @todo google workspace link
  - <https://developers.google.com/workspace/marketplace/create-badge>

A Gmail add-on that keeps threads with a chosen label out of your inbox by
archiving new replies on a schedule.

## 💩 Problem

Gmail does not have a way to archive a thread and keep it from coming back to
your inbox.

- Archived threads reappear in your inbox whenever there's a new reply
- Muted threads reappear whenever a reply is sent directly to you

This happens to me all the time with emails from recruiters who ping me
repeatedly, so I have to frequently re-archive those threads to keep my inbox
tidy.

## ✅ Solution

QuietLabels archives threads with your chosen label on a schedule, so new
replies will be swept up automatically.

- Simply move a thread to your chosen label to silence it
- Replies will still appear in the inbox, but only until the next time the
  add-on runs

## Usage

QuietLabels works by searching for threads that match your filter criteria and
then archiving them. This happens:

- Automatically on your chosen schedule
- When you click the "Run now" button

> ℹ️ To avoid issues with very large inboxes, the add-on will only clean up
> replies from the past 1 month on its first run. Future runs will clean up all
> new replies.

![screenshot-1](assets/images/screenshot-1.png)

![screenshot-2](assets/images/screenshot-2.png)

![screenshot-3](assets/images/screenshot-3.png)

> ⚠️ If you receive thousands of emails a day, this add-on may not be able to
> keep up.

## ❓ Frequently asked questions

### Why can't QuietLabels archive incoming replies as soon as they're received?

Gmail add-ons can't be triggered by new messages, so it has to run on a
schedule.

### Why can't I use a filter?

When you add a label to a thread in Gmail, it actually applies to the most
recent message instead of the thread itself[^1]. New messages in the thread
therefore don't inherit the label automatically, so a filter like this won't do
anything[^2][^3]:

> If a new message has label X, skip the inbox

In fact, new replies addressed directly to you will always move a thread back to
the inbox, even if it's muted! So the only solution is to use Google Apps Script
to automate the manual process of re-archiving these threads.

---

[^1]: <https://developers.google.com/workspace/gmail/api/guides/labels#manage_labels_on_messages_threads>

[^2]: <https://stackoverflow.com/questions/50394493/how-to-search-gmail-for-conversations-in-the-inbox-and-with-a-specific-label>

[^3]: <https://er4hn.info/blog/2024.10.26-gmail-labels/>
