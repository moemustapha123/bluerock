# Bluerock Email Notifications — Setup Guide

## What This Does

Firebase Cloud Functions watch the database in real time and send email alerts
to both owners whenever anything significant happens in the app.

**Covered:**
- New cleaning job created
- Cleaner self-assigns or unassigns a job
- Cleaner starts cleaning (arrives at property)
- Clean marked complete
- Before/after photos uploaded
- Low inventory item flagged
- Inventory item marked Ordered or Restocked
- New maintenance request submitted (🚨 URGENT flagged in subject for urgent tickets)
- Maintenance ticket status updated (Scheduled / In Progress / Resolved)
- Note added to a maintenance ticket
- Comment added to a maintenance ticket

---

## Prerequisites

- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- A SendGrid account (free tier works): https://sendgrid.com
  - Create an API key with "Mail Send" permission
  - Verify a sender email address (or domain) in SendGrid

---

## Step 1 — Install Dependencies

```bash
cd "Bluerock property management/functions"
npm install
```

---

## Step 2 — Log In to Firebase

```bash
firebase login
```

---

## Step 3 — Set Environment Config

Replace the placeholder values with real ones:

```bash
firebase functions:config:set \
  sendgrid.key="SG.YOUR_SENDGRID_API_KEY" \
  sendgrid.from="notifications@yourdomain.com" \
  owners.email1="owner1@email.com" \
  owners.email2="owner2@email.com" \
  app.url="https://bluerock-property-management.web.app"
```

- `sendgrid.key` — your SendGrid API key
- `sendgrid.from` — the verified sender email in SendGrid (must be verified)
- `owners.email1` / `owners.email2` — both owner emails that receive all alerts
- `app.url` — the URL where the HTML file is hosted (used for "Open in App" links)

To update any value later, just re-run `firebase functions:config:set` for that key and redeploy.

---

## Step 4 — Deploy

```bash
cd "Bluerock property management"
firebase deploy --only functions
```

That's it. Functions go live immediately.

---

## Step 5 — Verify

In the Firebase Console:
1. Go to **Functions** → check all functions are listed and status is ✅
2. Trigger any action in the app (e.g. create a test job)
3. Check both owner inboxes — email should arrive within ~5 seconds

If emails don't arrive, check **Functions → Logs** in the Firebase Console for errors.

---

## Adding or Removing an Owner Email

Edit the config and redeploy:

```bash
firebase functions:config:set owners.email1="newemail@example.com"
firebase deploy --only functions
```

---

## Functions Overview

| Function                  | Trigger                          | When It Fires                        |
|---------------------------|----------------------------------|--------------------------------------|
| `onJobCreated`            | `/jobs/{jobId}` created          | New cleaning job added               |
| `onJobUpdated`            | `/jobs/{jobId}` updated          | Cleaner assigned / status changed    |
| `onPhotoUploaded`         | `/jobPhotos/{jobId}/{id}` created| Before or after photo uploaded       |
| `onInventoryItemCreated`  | `/inventory/{prop}/{id}` created | Low inventory item flagged           |
| `onInventoryItemUpdated`  | `/inventory/{prop}/{id}` updated | Item marked Ordered / Restocked      |
| `onMaintenanceCreated`    | `/maintenance/{id}` created      | New maintenance ticket               |
| `onMaintenanceUpdated`    | `/maintenance/{id}` updated      | Status / note / comment changed      |

---

## Troubleshooting

**"Billing account not configured"** — Cloud Functions require the Blaze (pay-as-you-go) plan.
Free tier includes 2 million function invocations/month, which is more than enough for this app.
Upgrade at: Firebase Console → Project Settings → Usage and billing

**Emails land in spam** — In SendGrid, set up domain authentication (DNS records) for your sender domain.

**"Cannot read property 'key' of undefined"** — The environment config wasn't set.
Run `firebase functions:config:get` to verify the values are there, then redeploy.
