/**
 * Bluerock Property Management — Firebase Cloud Functions
 * Email notifications via SendGrid
 *
 * Setup: edit functions/.env with your keys, then: firebase deploy --only functions
 */

const functions = require("firebase-functions/v1");
const admin     = require("firebase-admin");
const sgMail    = require("@sendgrid/mail");

admin.initializeApp();
const db = admin.database();

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Lazy-init so env vars are read at call time, not module load time
function getSgMail() {
  sgMail.setApiKey(process.env.SENDGRID_KEY);
  return sgMail;
}

const FROM_EMAIL   = () => process.env.SENDGRID_FROM;
const OWNER_EMAILS = () => [process.env.OWNER_EMAIL1, process.env.OWNER_EMAIL2].filter(Boolean);
const APP_URL      = () => process.env.APP_URL || "https://bluerock-property-management.web.app";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function getProp(propId) {
  const snap = await db.ref(`properties/${propId}`).once("value");
  return snap.val() || { name: propId, address: "" };
}

async function getCleanerAccount(cleanerName) {
  if (!cleanerName) return null;
  const snap = await db.ref("accounts").orderByChild("name").equalTo(cleanerName).once("value");
  const accs = Object.values(snap.val() || {});
  return accs[0] || null;
}

// Send email + FCM push to a specific cleaner
async function notifyCleaner(cleanerName, subject, html) {
  const acc = await getCleanerAccount(cleanerName);
  if (!acc) return;
  // Email
  if (acc.email) {
    await sendToExtra(acc.email, subject, html);
  }
  // FCM push (fires only if the cleaner has granted notification permission in the app)
  if (acc.fcmToken) {
    try {
      const body = subject.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").trim();
      await admin.messaging().send({
        token: acc.fcmToken,
        notification: { title: "Bluerock Property Management", body },
        webpush: {
          notification: { icon: "https://bluerock-property-management.web.app/icon.png", badge: "1" },
          fcmOptions: { link: `${APP_URL()}#myjobs` },
        },
      });
    } catch (e) { console.warn(`FCM push failed for ${cleanerName}:`, e.message); }
  }
}

// YYYY-MM-DD string for a given offset from now in Toronto timezone
function tzDateStr(daysOffset = 0) {
  const d = new Date(Date.now() + daysOffset * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// Format a YYYY-MM-DD checkout date as "Mon, Apr 28, 2026"
function fmtCheckout(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

// Short version for email subject: "Apr 28"
function fmtCheckoutShort(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Highlighted "action by" row — stands out visually
function actionRow(label, name) {
  if (!name) return "";
  return `
    <tr>
      <td style="padding:7px 0;font-size:13px;color:#64748B;width:140px;vertical-align:top;font-weight:600;">${label}</td>
      <td style="padding:7px 0;font-size:13px;vertical-align:top;">
        <span style="background:#EFF6FF;color:#1D4ED8;font-weight:700;padding:2px 10px;border-radius:20px;">👤 ${name}</span>
      </td>
    </tr>`;
}

function tabLink(tab, label = "Open in App") {
  return `<a href="${APP_URL()}#${tab}" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#1B4FD8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label} →</a>`;
}

function row(label, value) {
  if (!value && value !== 0) return "";
  return `
    <tr>
      <td style="padding:7px 0;font-size:13px;color:#64748B;width:140px;vertical-align:top;font-weight:600;">${label}</td>
      <td style="padding:7px 0;font-size:13px;color:#0F172A;vertical-align:top;">${value}</td>
    </tr>`;
}

function emailHtml({ subject, badge, badgeColor = "#1B4FD8", rows = [], note, cta }) {
  const badgeHtml = badge
    ? `<span style="display:inline-block;padding:4px 12px;border-radius:20px;background:${badgeColor};color:#fff;font-size:12px;font-weight:700;margin-left:10px;">${badge}</span>`
    : "";

  const rowsHtml = rows.length
    ? `<table style="width:100%;border-collapse:collapse;margin-top:12px;">${rows.join("")}</table>`
    : "";

  const noteHtml = note
    ? `<div style="margin-top:14px;padding:12px 14px;background:#F8FAFF;border-left:3px solid #1B4FD8;border-radius:0 8px 8px 0;font-size:13px;color:#334155;line-height:1.6;">${note}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0F2557;padding:22px 28px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#93C5FD;margin-bottom:4px;">BLUEROCK PROPERTY MANAGEMENT</div>
            <div style="font-size:19px;font-weight:700;color:#fff;line-height:1.3;">${subject}${badgeHtml}</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:24px 28px;">
            ${rowsHtml}
            ${noteHtml}
            ${cta ? `<div>${cta}</div>` : ""}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #E2E8F0;background:#F8FAFF;">
            <div style="font-size:11px;color:#94A3B8;text-align:center;">Bluerock Property Management · Automated Notification · ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendToExtra(email, subject, html) {
  if (!email) return; // disabled until activated
  const mailer = getSgMail();
  await mailer.send({ to: email, from: { name: "Bluerock Property Management", email: FROM_EMAIL() }, subject, html });
}

async function sendEmail(subject, html) {
  const emails = OWNER_EMAILS();
  if (!emails.length) { console.warn("No owner emails configured."); return; }
  const mailer   = getSgMail();
  const fromAddr = FROM_EMAIL();
  const messages = emails.map(to => ({
    to,
    from: { name: "Bluerock Property Management", email: fromAddr },
    subject,
    html,
  }));
  await Promise.all(messages.map(m => mailer.send(m)));
}

// ─── CLEANING JOBS ───────────────────────────────────────────────────────────

exports.onJobCreated = functions.database.ref("/jobs/{jobId}").onCreate(async (snap) => {
  const job  = snap.val();
  const prop = await getProp(job.propertyId);
  const dateShort = fmtCheckoutShort(job.checkoutDate);

  const subject = `🧹 New Cleaning Job — ${prop.name}${dateShort ? ` · Checkout ${dateShort}` : ""}`;
  const html = emailHtml({
    subject,
    rows: [
      row("Property",      prop.name),
      row("Address",       prop.address),
      row("Checkout Date", `<strong>${fmtCheckout(job.checkoutDate)}</strong>`),
      actionRow("Created by", job.createdBy || "System (iCal sync)"),
      row("Status",        "Pending — no cleaner assigned yet"),
      row("Created",       fmtDate(job.createdAt)),
    ],
    cta: tabLink("jobs", "View Jobs"),
  });

  await sendEmail(subject, html);

  // Cleaning company — new job alert only. Uncomment the line below to activate.
  // const CLEANING_CO_EMAIL = "hello@getcleanaf.ca";
  await sendToExtra(/* CLEANING_CO_EMAIL */ null, subject, html);

  console.log(`[onJobCreated] Notified owners — ${prop.name}`);
});

exports.onJobUpdated = functions.database.ref("/jobs/{jobId}").onUpdate(async (change) => {
  const before = change.before.val();
  const after  = change.after.val();
  if (!after) return;

  const prop = await getProp(after.propertyId);
  const tasks = [];

  const dateShort = fmtCheckoutShort(after.checkoutDate);
  const dateLong  = fmtCheckout(after.checkoutDate);

  // ── Cleaner assigned or changed ──────────────────────────────────────────
  if ((before.cleaner || null) !== (after.cleaner || null)) {
    // Owners: who claimed/unassigned
    const ownerSubject = after.cleaner
      ? `👤 ${after.cleaner} claimed a job — ${prop.name}${dateShort ? ` · ${dateShort}` : ""}`
      : `❌ Cleaner unassigned — ${prop.name}${dateShort ? ` · ${dateShort}` : ""}`;
    const ownerHtml = emailHtml({
      subject: ownerSubject,
      rows: [
        row("Property",      prop.name),
        row("Checkout Date", `<strong>${dateLong}</strong>`),
        actionRow(after.cleaner ? "Claimed by" : "Unassigned", after.cleaner || before.cleaner),
        row("Address",       prop.address),
        row("Updated",       fmtDate(after.updatedAt)),
      ],
      cta: tabLink("jobs"),
    });
    tasks.push(sendEmail(ownerSubject, ownerHtml));

    // New cleaner: assignment confirmation
    if (after.cleaner) {
      const cleanerSubject = `🧹 New job assigned — ${prop.name} · ${dateShort || dateLong}`;
      const cleanerHtml = emailHtml({
        subject: cleanerSubject,
        badge: "New Job",
        badgeColor: "#2563EB",
        rows: [
          row("Property",      prop.name),
          row("Address",       prop.address),
          row("Checkout Date", `<strong>${dateLong}</strong>`),
          row("Checkout Time", prop.checkoutTime || "11:00 AM"),
          row("Check-in Time", prop.checkinTime  || "3:00 PM"),
          row("Assigned to",   after.cleaner),
        ],
        note: `You have a new cleaning job booked at <strong>${prop.name}</strong> on <strong>${dateLong}</strong>. Checkout is at ${prop.checkoutTime || "11:00 AM"} and the next guest arrives at ${prop.checkinTime || "3:00 PM"}.`,
        cta: tabLink("myjobs", "View My Jobs"),
      });
      tasks.push(notifyCleaner(after.cleaner, cleanerSubject, cleanerHtml));
    }

    // Previous cleaner: unassigned notification
    if (before.cleaner && !after.cleaner) {
      const cancelSubject = `❌ Job removed from your schedule — ${prop.name} · ${dateShort || dateLong}`;
      const cancelHtml = emailHtml({
        subject: cancelSubject,
        badge: "Unassigned",
        badgeColor: "#6B7280",
        rows: [
          row("Property",      prop.name),
          row("Checkout Date", `<strong>${dateLong}</strong>`),
        ],
        note: `The cleaning job at <strong>${prop.name}</strong> on <strong>${dateLong}</strong> has been removed from your schedule. If you have questions, contact your manager.`,
        cta: tabLink("myjobs", "View My Jobs"),
      });
      tasks.push(notifyCleaner(before.cleaner, cancelSubject, cancelHtml));
    }
  }

  // ── Status changed ────────────────────────────────────────────────────────
  if (before.status !== after.status) {
    const statusLabels = {
      "pending":     "Pending",
      "in-progress": "🕐 Cleaner has arrived & started",
      "complete":    "✅ Completed",
    };
    const ownerSubject = after.status === "complete"
      ? `✅ Clean Complete — ${prop.name}${dateShort ? ` · ${dateShort}` : ""}`
      : after.status === "in-progress"
      ? `🕐 Cleaning Started — ${prop.name}${dateShort ? ` · ${dateShort}` : ""}`
      : `🔄 Job Updated — ${prop.name}${dateShort ? ` · ${dateShort}` : ""}`;

    const ownerHtml = emailHtml({
      subject: ownerSubject,
      badge:      statusLabels[after.status] || after.status,
      badgeColor: after.status === "complete" ? "#059669" : after.status === "in-progress" ? "#2563EB" : "#6B7280",
      rows: [
        row("Property",      prop.name),
        row("Checkout Date", `<strong>${dateLong}</strong>`),
        actionRow(after.status === "complete" ? "Completed by" : "Started by", after.cleaner),
        row("Address",       prop.address),
        row("Updated",       fmtDate(after.updatedAt)),
      ],
      cta: tabLink("jobs"),
    });
    tasks.push(sendEmail(ownerSubject, ownerHtml));

    // Cleaner: job complete confirmation
    if (after.status === "complete" && after.cleaner) {
      const doneSubject = `✅ Job complete — nice work! · ${prop.name}`;
      const doneHtml = emailHtml({
        subject: doneSubject,
        badge: "Completed",
        badgeColor: "#059669",
        rows: [
          row("Property",    prop.name),
          row("Completed",   fmtDate(after.completedAt || after.updatedAt)),
          row("Cleaner",     after.cleaner),
        ],
        note: `Great work on <strong>${prop.name}</strong>! The job has been marked complete. Your owners have been notified.`,
        cta: tabLink("myjobs", "View My Jobs"),
      });
      tasks.push(notifyCleaner(after.cleaner, doneSubject, doneHtml));
    }
  }

  await Promise.all(tasks);
});

// ─── OVERDUE ALERT ────────────────────────────────────────────────────────────
exports.onJobOverdue = functions.database.ref("/jobs/{jobId}/overdueAlertSent").onCreate(async (snap, ctx) => {
  if (!snap.val()) return;

  const jobSnap = await db.ref(`jobs/${ctx.params.jobId}`).once("value");
  const job     = jobSnap.val();
  if (!job || job.status === "complete") return;

  const prop = await getProp(job.propertyId);
  const checkoutDate = job.checkoutDate
    ? new Date(...job.checkoutDate.split("-").map((v,i)=>i===1?v-1:Number(v))).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})
    : "—";

  const subject = `🚨 OVERDUE — Clean not complete at ${prop.name}`;
  const html = emailHtml({
    subject,
    badge:      "OVERDUE",
    badgeColor: "#DC2626",
    rows: [
      row("Property",      prop.name),
      row("Address",       prop.address),
      row("Checkout Date", `<strong>${checkoutDate}</strong>`),
      row("Cleaner",       job.cleaner || "Unassigned"),
      row("Job Status",    job.status),
      row("Guest arrives", prop.checkinTime || "3:00 PM"),
    ],
    note: "⚠️ The cleaning window has expired and this job has not been marked complete. A guest may be arriving soon.",
    cta:  tabLink("jobs", "View Job"),
  });

  await sendEmail(subject, html);
  console.log(`[onJobOverdue] OVERDUE alert sent — ${prop.name}`);
});

// ─── PHOTOS ──────────────────────────────────────────────────────────────────

exports.onPhotoUploaded = functions.database.ref("/jobPhotos/{jobId}/{photoId}").onCreate(async (snap, ctx) => {
  const photo = snap.val();
  if (!photo) return;

  // Look up the job to find property
  const jobSnap = await db.ref(`jobs/${ctx.params.jobId}`).once("value");
  const job     = jobSnap.val();
  if (!job) return;

  const prop      = await getProp(job.propertyId);
  const isAfter   = photo.type === "after";
  const dateShort = fmtCheckoutShort(job.checkoutDate);

  const subject = isAfter
    ? `✅ After-Clean Photo — ${prop.name}${dateShort ? ` · ${dateShort}` : ""}`
    : `📷 Before-Clean Photo — ${prop.name}${dateShort ? ` · ${dateShort}` : ""}`;

  const html = emailHtml({
    subject,
    badge:      isAfter ? "After Clean" : "Before Clean",
    badgeColor: isAfter ? "#059669" : "#D97706",
    rows: [
      row("Property",      prop.name),
      row("Checkout Date", `<strong>${fmtCheckout(job.checkoutDate)}</strong>`),
      actionRow("Uploaded by", photo.uploadedBy),
      row("Photo Type",    isAfter ? "After clean" : "Before clean"),
      row("Uploaded",      fmtDate(photo.uploadedAt)),
    ],
    note: "Photo is stored in the app. Open the calendar to view the full image.",
    cta:  tabLink("calendar", "View in Calendar"),
  });

  await sendEmail(subject, html);
});

// ─── INVENTORY ───────────────────────────────────────────────────────────────

exports.onInventoryItemCreated = functions.database.ref("/inventory/{propId}/{itemId}").onCreate(async (snap, ctx) => {
  const item = snap.val();
  if (!item) return;

  const prop    = await getProp(ctx.params.propId);
  const subject = `📦 Low Inventory Flagged — ${prop.name}`;

  const html = emailHtml({
    subject,
    badge:      "Needs Restock",
    badgeColor: "#D97706",
    rows: [
      row("Property",    prop.name),
      row("Item",        item.name),
      row("Flagged by",  item.flaggedBy || item.createdBy || "—"),
      row("Notes",       item.notes),
      row("Flagged",     fmtDate(item.createdAt || item.flaggedAt)),
    ],
    cta: tabLink("inventory", "View Inventory"),
  });

  await sendEmail(subject, html);
});

exports.onInventoryItemUpdated = functions.database.ref("/inventory/{propId}/{itemId}").onUpdate(async (change, ctx) => {
  const before = change.before.val();
  const after  = change.after.val();
  if (!after || before.status === after.status) return;

  const prop = await getProp(ctx.params.propId);

  const statusMap = {
    ordered:    { label: "🛒 Ordered",   color: "#2563EB" },
    restocked:  { label: "✅ Restocked", color: "#059669" },
    needed:     { label: "⚠️ Needed",   color: "#D97706" },
  };
  const statusInfo = statusMap[after.status] || { label: after.status, color: "#6B7280" };

  const subject = `${statusInfo.label} — ${after.name} at ${prop.name}`;

  const html = emailHtml({
    subject,
    badge:      statusInfo.label,
    badgeColor: statusInfo.color,
    rows: [
      row("Property",    prop.name),
      row("Item",        after.name),
      row("Old Status",  before.status || "—"),
      row("New Status",  after.status),
      row("Updated by",  after.updatedBy || "—"),
      row("Updated",     fmtDate(after.updatedAt)),
    ],
    cta: tabLink("inventory"),
  });

  await sendEmail(subject, html);
});

// ─── MAINTENANCE ─────────────────────────────────────────────────────────────

exports.onMaintenanceCreated = functions.database.ref("/maintenance/{ticketId}").onCreate(async (snap) => {
  const ticket = snap.val();
  if (!ticket) return;

  const prop      = await getProp(ticket.propertyId);
  const isUrgent  = ticket.urgency === "urgent";
  const isDamage  = /damage|broken|crack|flood|leak/i.test(ticket.category + " " + ticket.title);

  let subject;
  if (isUrgent)      subject = `🚨 URGENT Maintenance — ${prop.name}`;
  else if (isDamage) subject = `⚠️ Damage Report — ${prop.name}`;
  else               subject = `🔧 New Maintenance Request — ${prop.name}`;

  const urgencyLabel = { low: "Low", medium: "Medium", urgent: "🚨 Urgent" };

  const html = emailHtml({
    subject,
    badge:      urgencyLabel[ticket.urgency] || ticket.urgency,
    badgeColor: isUrgent ? "#DC2626" : isDamage ? "#D97706" : "#2563EB",
    rows: [
      row("Property",    prop.name),
      row("Category",    ticket.category),
      row("Urgency",     urgencyLabel[ticket.urgency] || ticket.urgency),
      row("Title",       `<strong>${ticket.title}</strong>`),
      row("Description", ticket.description),
      row("Submitted by",ticket.submittedBy),
      row("Submitted",   fmtDate(ticket.submittedAt)),
    ],
    note: isUrgent ? "⚠️ This request has been marked <strong>Urgent</strong>. Immediate attention may be required." : null,
    cta:  tabLink("maintenance", "View Ticket"),
  });

  await sendEmail(subject, html);
});

exports.onMaintenanceUpdated = functions.database.ref("/maintenance/{ticketId}").onUpdate(async (change) => {
  const before = change.before.val();
  const after  = change.after.val();
  if (!after) return;

  const prop = await getProp(after.propertyId);
  const tasks = [];

  // Status changed
  if (before.status !== after.status) {
    const statusLabel = { open: "Open", scheduled: "Scheduled", "in-progress": "In Progress", resolved: "✅ Resolved" };
    const subject = after.status === "resolved"
      ? `✅ Maintenance Resolved — ${prop.name}`
      : `🔄 Maintenance Updated — ${prop.name}`;

    const html = emailHtml({
      subject,
      badge:      statusLabel[after.status] || after.status,
      badgeColor: after.status === "resolved" ? "#059669" : after.status === "in-progress" ? "#2563EB" : "#D97706",
      rows: [
        row("Property",   prop.name),
        row("Ticket",     after.title),
        row("Category",   after.category),
        row("Old Status", statusLabel[before.status] || before.status),
        row("New Status", statusLabel[after.status]  || after.status),
        row("Updated",    fmtDate(after.updatedAt)),
      ],
      cta: tabLink("maintenance"),
    });
    tasks.push(sendEmail(subject, html));
  }

  // Note added or changed
  if (after.note && after.note !== before.note) {
    const subject = `📝 Note Added — ${prop.name}`;
    const html = emailHtml({
      subject,
      rows: [
        row("Property", prop.name),
        row("Ticket",   after.title),
        row("Note by",  after.noteBy || "—"),
        row("Note",     after.note),
        row("Added",    fmtDate(after.noteAt)),
      ],
      cta: tabLink("maintenance"),
    });
    tasks.push(sendEmail(subject, html));
  }

  // New comment added (compare comment counts)
  const beforeComments = Object.keys(before.comments || {}).length;
  const afterComments  = Object.keys(after.comments  || {}).length;
  if (afterComments > beforeComments) {
    const newCommentKey = Object.keys(after.comments).find(k => !(before.comments || {})[k]);
    const comment = newCommentKey ? after.comments[newCommentKey] : null;

    const subject = `💬 Comment on Maintenance — ${prop.name}`;
    const html = emailHtml({
      subject,
      rows: [
        row("Property",  prop.name),
        row("Ticket",    after.title),
        row("Comment by",comment?.by    || "—"),
        row("Comment",   comment?.text  || "—"),
        row("Posted",    fmtDate(comment?.at)),
      ],
      cta: tabLink("maintenance"),
    });
    tasks.push(sendEmail(subject, html));
  }

  await Promise.all(tasks);
});

// ─── LANDSCAPE / GARBAGE HELPERS ─────────────────────────────────────────────

async function notifyWorker(workerName, subject, html) {
  const acc = await getCleanerAccount(workerName); // same lookup by name
  if (!acc) return;
  if (acc.email) await sendToExtra(acc.email, subject, html);
  if (acc.fcmToken) {
    try {
      const body = subject.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").trim();
      await admin.messaging().send({
        token: acc.fcmToken,
        notification: { title: "Bluerock Property Management", body },
        webpush: {
          notification: { icon: "https://bluerock-property-management.web.app/icon.png" },
          fcmOptions: { link: `${APP_URL()}#myjobs` },
        },
      });
    } catch (e) { console.warn(`FCM push failed for ${workerName}:`, e.message); }
  }
}

// ─── LANDSCAPE JOBS ───────────────────────────────────────────────────────────

exports.onLandscapeJobCreated = functions.database.ref("/landscapeJobs/{jobId}").onCreate(async (snap) => {
  const job  = snap.val();
  const prop = await getProp(job.propertyId);
  const dateShort = job.scheduledDate ? fmtCheckoutShort(job.scheduledDate) : "";

  const subject = `🌿 New Landscape Job — ${prop.name}${dateShort ? ` · ${dateShort}` : ""}`;
  const html = emailHtml({
    subject,
    rows: [
      row("Property",       prop.name),
      row("Address",        prop.address),
      row("Scheduled Date", `<strong>${fmtCheckout(job.scheduledDate)}</strong>`),
      actionRow("Created by", job.createdBy || "System"),
      row("Notes",          job.notes || "—"),
      row("Status",         "Pending — no worker assigned"),
    ],
    cta: tabLink("landscape", "View Landscape"),
  });
  await sendEmail(subject, html);
  console.log(`[onLandscapeJobCreated] Notified owners — ${prop.name}`);
});

exports.onLandscapeJobUpdated = functions.database.ref("/landscapeJobs/{jobId}").onUpdate(async (change) => {
  const before = change.before.val();
  const after  = change.after.val();
  if (!after) return;

  const prop      = await getProp(after.propertyId);
  const tasks     = [];
  const dateShort = job => job.scheduledDate ? fmtCheckoutShort(job.scheduledDate) : "";
  const dateLong  = after.scheduledDate ? fmtCheckout(after.scheduledDate) : "—";

  // Worker assigned or changed
  if ((before.worker || null) !== (after.worker || null)) {
    const ownerSubject = after.worker
      ? `👤 ${after.worker} assigned — ${prop.name}${dateShort(after) ? ` · ${dateShort(after)}` : ""}`
      : `❌ Landscaper unassigned — ${prop.name}${dateShort(after) ? ` · ${dateShort(after)}` : ""}`;
    tasks.push(sendEmail(ownerSubject, emailHtml({
      subject: ownerSubject,
      rows: [
        row("Property",       prop.name),
        row("Scheduled Date", `<strong>${dateLong}</strong>`),
        actionRow(after.worker ? "Assigned to" : "Unassigned", after.worker || before.worker),
        row("Address",        prop.address),
      ],
      cta: tabLink("landscape"),
    })));

    if (after.worker) {
      const ws = `🌿 New landscaping job — ${prop.name} · ${dateShort(after) || dateLong}`;
      tasks.push(notifyWorker(after.worker, ws, emailHtml({
        subject: ws, badge: "New Job", badgeColor: "#059669",
        rows: [
          row("Property",       prop.name),
          row("Address",        prop.address),
          row("Scheduled Date", `<strong>${dateLong}</strong>`),
          row("Notes",          after.notes || "—"),
        ],
        note: `You have a new landscaping job at <strong>${prop.name}</strong> on <strong>${dateLong}</strong>.`,
        cta: tabLink("myjobs", "View My Jobs"),
      })));
    }
    if (before.worker && !after.worker) {
      const cs = `❌ Landscape job removed — ${prop.name} · ${dateShort(after) || dateLong}`;
      tasks.push(notifyWorker(before.worker, cs, emailHtml({
        subject: cs, badge: "Unassigned", badgeColor: "#6B7280",
        rows: [row("Property", prop.name), row("Scheduled Date", `<strong>${dateLong}</strong>`)],
        note: `The landscaping job at <strong>${prop.name}</strong> on <strong>${dateLong}</strong> has been removed from your schedule.`,
        cta: tabLink("myjobs", "View My Jobs"),
      })));
    }
  }

  // Status changed
  if (before.status !== after.status) {
    const ownerSubject = after.status === "complete"
      ? `✅ Landscape Complete — ${prop.name}${dateShort(after) ? ` · ${dateShort(after)}` : ""}`
      : `🔄 Landscape Updated — ${prop.name}${dateShort(after) ? ` · ${dateShort(after)}` : ""}`;
    tasks.push(sendEmail(ownerSubject, emailHtml({
      subject: ownerSubject,
      badge: after.status === "complete" ? "Complete" : after.status,
      badgeColor: after.status === "complete" ? "#059669" : "#2563EB",
      rows: [
        row("Property", prop.name),
        row("Scheduled Date", `<strong>${dateLong}</strong>`),
        actionRow(after.status === "complete" ? "Completed by" : "Updated by", after.worker),
      ],
      cta: tabLink("landscape"),
    })));
    if (after.status === "complete" && after.worker) {
      const ds = `✅ Landscape job complete — nice work! · ${prop.name}`;
      tasks.push(notifyWorker(after.worker, ds, emailHtml({
        subject: ds, badge: "Completed", badgeColor: "#059669",
        rows: [row("Property", prop.name), row("Scheduled Date", `<strong>${dateLong}</strong>`)],
        note: `Great work on <strong>${prop.name}</strong>! The landscaping job has been marked complete.`,
        cta: tabLink("myjobs", "View My Jobs"),
      })));
    }
  }

  await Promise.all(tasks);
});

// ─── GARBAGE JOBS ─────────────────────────────────────────────────────────────

exports.onGarbageJobCreated = functions.database.ref("/garbageJobs/{jobId}").onCreate(async (snap) => {
  const job  = snap.val();
  const prop = await getProp(job.propertyId);
  const dateShort = job.scheduledDate ? fmtCheckoutShort(job.scheduledDate) : "";
  const dateLong  = fmtCheckout(job.scheduledDate);

  const ownerSubject = `🗑 New Garbage Pickup — ${prop.name}${dateShort ? ` · ${dateShort}` : ""}`;
  const ownerHtml = emailHtml({
    subject: ownerSubject,
    rows: [
      row("Property",       prop.name),
      row("Address",        prop.address),
      row("Scheduled Date", `<strong>${dateLong}</strong>`),
      actionRow("Created by", job.createdBy || "System"),
      actionRow("Assigned to", job.worker || "Unassigned"),
      row("Notes",          job.notes || "—"),
    ],
    cta: tabLink("garbage", "View Garbage"),
  });
  const tasks = [sendEmail(ownerSubject, ownerHtml)];

  // Notify the worker immediately if already assigned at creation (e.g. auto-scheduled jobs)
  if (job.worker) {
    const ws = `🗑 New garbage pickup confirmed — ${prop.name} · ${dateShort || dateLong}`;
    tasks.push(notifyWorker(job.worker, ws, emailHtml({
      subject: ws, badge: "Job Confirmed", badgeColor: "#6B7280",
      rows: [
        row("Property",       prop.name),
        row("Address",        prop.address),
        row("Scheduled Date", `<strong>${dateLong}</strong>`),
        row("Notes",          job.notes || "—"),
      ],
      note: `You have a garbage pickup confirmed at <strong>${prop.name}</strong> on <strong>${dateLong}</strong>.`,
      cta: tabLink("myjobs", "View My Jobs"),
    })));
  }

  await Promise.all(tasks);
  console.log(`[onGarbageJobCreated] Notified owners${job.worker ? ` + ${job.worker}` : ""} — ${prop.name}`);
});

exports.onGarbageJobUpdated = functions.database.ref("/garbageJobs/{jobId}").onUpdate(async (change) => {
  const before = change.before.val();
  const after  = change.after.val();
  if (!after) return;

  const prop      = await getProp(after.propertyId);
  const tasks     = [];
  const dateShort = job => job.scheduledDate ? fmtCheckoutShort(job.scheduledDate) : "";
  const dateLong  = after.scheduledDate ? fmtCheckout(after.scheduledDate) : "—";

  if ((before.worker || null) !== (after.worker || null)) {
    const ownerSubject = after.worker
      ? `👤 ${after.worker} assigned — ${prop.name}${dateShort(after) ? ` · ${dateShort(after)}` : ""}`
      : `❌ Collector unassigned — ${prop.name}${dateShort(after) ? ` · ${dateShort(after)}` : ""}`;
    tasks.push(sendEmail(ownerSubject, emailHtml({
      subject: ownerSubject,
      rows: [
        row("Property",       prop.name),
        row("Scheduled Date", `<strong>${dateLong}</strong>`),
        actionRow(after.worker ? "Assigned to" : "Unassigned", after.worker || before.worker),
        row("Address",        prop.address),
      ],
      cta: tabLink("garbage"),
    })));

    if (after.worker) {
      const ws = `🗑 New garbage pickup — ${prop.name} · ${dateShort(after) || dateLong}`;
      tasks.push(notifyWorker(after.worker, ws, emailHtml({
        subject: ws, badge: "New Job", badgeColor: "#6B7280",
        rows: [
          row("Property",       prop.name),
          row("Address",        prop.address),
          row("Scheduled Date", `<strong>${dateLong}</strong>`),
          row("Notes",          after.notes || "—"),
        ],
        note: `You have a new garbage pickup at <strong>${prop.name}</strong> on <strong>${dateLong}</strong>.`,
        cta: tabLink("myjobs", "View My Jobs"),
      })));
    }
    if (before.worker && !after.worker) {
      const cs = `❌ Garbage pickup removed — ${prop.name} · ${dateShort(after) || dateLong}`;
      tasks.push(notifyWorker(before.worker, cs, emailHtml({
        subject: cs, badge: "Unassigned", badgeColor: "#6B7280",
        rows: [row("Property", prop.name), row("Scheduled Date", `<strong>${dateLong}</strong>`)],
        note: `The garbage pickup at <strong>${prop.name}</strong> on <strong>${dateLong}</strong> has been removed from your schedule.`,
        cta: tabLink("myjobs", "View My Jobs"),
      })));
    }
  }

  if (before.status !== after.status) {
    const ownerSubject = after.status === "complete"
      ? `✅ Garbage Pickup Complete — ${prop.name}${dateShort(after) ? ` · ${dateShort(after)}` : ""}`
      : `🔄 Garbage Updated — ${prop.name}${dateShort(after) ? ` · ${dateShort(after)}` : ""}`;
    tasks.push(sendEmail(ownerSubject, emailHtml({
      subject: ownerSubject,
      badge: after.status === "complete" ? "Complete" : after.status,
      badgeColor: after.status === "complete" ? "#059669" : "#2563EB",
      rows: [
        row("Property", prop.name),
        row("Scheduled Date", `<strong>${dateLong}</strong>`),
        actionRow(after.status === "complete" ? "Completed by" : "Updated by", after.worker),
      ],
      cta: tabLink("garbage"),
    })));
    if (after.status === "complete" && after.worker) {
      const ds = `✅ Garbage pickup complete — nice work! · ${prop.name}`;
      tasks.push(notifyWorker(after.worker, ds, emailHtml({
        subject: ds, badge: "Completed", badgeColor: "#059669",
        rows: [row("Property", prop.name), row("Scheduled Date", `<strong>${dateLong}</strong>`)],
        note: `Great work! The garbage pickup at <strong>${prop.name}</strong> has been marked complete.`,
        cta: tabLink("myjobs", "View My Jobs"),
      })));
    }
  }

  await Promise.all(tasks);
});

// ─── DAILY REMINDERS (7:00 AM Toronto time) ───────────────────────────────────
exports.dailyReminders = functions.pubsub.schedule("0 7 * * *")
  .timeZone("America/Toronto")
  .onRun(async () => {
    const todayStr    = tzDateStr(0);
    const tomorrowStr = tzDateStr(1);

    // ── Cleaning jobs ────────────────────────────────────────────────────────
    const snap = await db.ref("jobs").once("value");
    const allJobs = Object.values(snap.val() || {});

    for (const job of allJobs) {
      if (!job.cleaner || job.status === "complete") continue;
      const prop = await getProp(job.propertyId);

      // Day-before reminder
      if (job.checkoutDate === tomorrowStr && !job.reminderDayBefore) {
        const subject = `📅 Reminder: job tomorrow — ${prop.name}`;
        const html = emailHtml({
          subject,
          badge: "Tomorrow",
          badgeColor: "#2563EB",
          rows: [
            row("Property",      prop.name),
            row("Address",       prop.address),
            row("Checkout Date", `<strong>${fmtCheckout(job.checkoutDate)}</strong>`),
            row("Checkout Time", prop.checkoutTime || "11:00 AM"),
            row("Guest arrives", prop.checkinTime  || "3:00 PM"),
          ],
          note: `Just a reminder — you have a cleaning job at <strong>${prop.name}</strong> tomorrow. Checkout is at ${prop.checkoutTime || "11:00 AM"}.`,
          cta: tabLink("myjobs", "View My Jobs"),
        });
        await Promise.all([
          db.ref(`jobs/${job.id}/reminderDayBefore`).set(true),
          notifyCleaner(job.cleaner, subject, html),
        ]);
        console.log(`[dailyReminders] Day-before sent to ${job.cleaner} — ${prop.name}`);
      }

      // Morning-of reminder
      if (job.checkoutDate === todayStr && !job.reminderMorningOf) {
        const subject = `☀️ Today's job — ${prop.name} · Checkout ${prop.checkoutTime || "11:00 AM"}`;
        const html = emailHtml({
          subject,
          badge: "Today",
          badgeColor: "#DC2626",
          rows: [
            row("Property",      prop.name),
            row("Address",       prop.address),
            row("Checkout Time", `<strong>${prop.checkoutTime || "11:00 AM"}</strong>`),
            row("Guest arrives", `<strong>${prop.checkinTime  || "3:00 PM"}</strong>`),
            row("Cleaner",       job.cleaner),
          ],
          note: `Good morning! You have a clean today at <strong>${prop.name}</strong>. Guest checks out at ${prop.checkoutTime || "11:00 AM"} and the next guest arrives at ${prop.checkinTime || "3:00 PM"}.`,
          cta: tabLink("myjobs", "View My Jobs"),
        });
        await Promise.all([
          db.ref(`jobs/${job.id}/reminderMorningOf`).set(true),
          notifyCleaner(job.cleaner, subject, html),
        ]);
        console.log(`[dailyReminders] Morning-of sent to ${job.cleaner} — ${prop.name}`);
      }
    }

    // ── Landscape jobs ───────────────────────────────────────────────────────
    const lSnap = await db.ref("landscapeJobs").once("value");
    for (const job of Object.values(lSnap.val() || {})) {
      if (!job.worker || job.status === "complete") continue;
      const prop = await getProp(job.propertyId);

      if (job.scheduledDate === tomorrowStr && !job.reminderDayBefore) {
        const subject = `📅 Reminder: landscaping job tomorrow — ${prop.name}`;
        const html = emailHtml({
          subject, badge: "Tomorrow", badgeColor: "#2563EB",
          rows: [
            row("Property",       prop.name),
            row("Address",        prop.address),
            row("Scheduled Date", `<strong>${fmtCheckout(job.scheduledDate)}</strong>`),
            row("Notes",          job.notes || "—"),
          ],
          note: `Just a reminder — you have a landscaping job at <strong>${prop.name}</strong> tomorrow.`,
          cta: tabLink("myjobs", "View My Jobs"),
        });
        await Promise.all([
          db.ref(`landscapeJobs/${job.id}/reminderDayBefore`).set(true),
          notifyWorker(job.worker, subject, html),
        ]);
      }

      if (job.scheduledDate === todayStr && !job.reminderMorningOf) {
        const subject = `☀️ Today's landscaping job — ${prop.name}`;
        const html = emailHtml({
          subject, badge: "Today", badgeColor: "#DC2626",
          rows: [
            row("Property",       prop.name),
            row("Address",        prop.address),
            row("Scheduled Date", `<strong>${fmtCheckout(job.scheduledDate)}</strong>`),
            row("Notes",          job.notes || "—"),
          ],
          note: `Good morning! You have a landscaping job today at <strong>${prop.name}</strong>.`,
          cta: tabLink("myjobs", "View My Jobs"),
        });
        await Promise.all([
          db.ref(`landscapeJobs/${job.id}/reminderMorningOf`).set(true),
          notifyWorker(job.worker, subject, html),
        ]);
      }
    }

    // ── Garbage jobs ─────────────────────────────────────────────────────────
    const gSnap = await db.ref("garbageJobs").once("value");
    for (const job of Object.values(gSnap.val() || {})) {
      if (!job.worker || job.status === "complete") continue;
      const prop = await getProp(job.propertyId);

      if (job.scheduledDate === tomorrowStr && !job.reminderDayBefore) {
        const subject = `📅 Reminder: garbage pickup tomorrow — ${prop.name}`;
        const html = emailHtml({
          subject, badge: "Tomorrow", badgeColor: "#2563EB",
          rows: [
            row("Property",       prop.name),
            row("Address",        prop.address),
            row("Scheduled Date", `<strong>${fmtCheckout(job.scheduledDate)}</strong>`),
            row("Notes",          job.notes || "—"),
          ],
          note: `Just a reminder — you have a garbage pickup at <strong>${prop.name}</strong> tomorrow.`,
          cta: tabLink("myjobs", "View My Jobs"),
        });
        await Promise.all([
          db.ref(`garbageJobs/${job.id}/reminderDayBefore`).set(true),
          notifyWorker(job.worker, subject, html),
        ]);
      }

      if (job.scheduledDate === todayStr && !job.reminderMorningOf) {
        const subject = `☀️ Today's garbage pickup — ${prop.name}`;
        const html = emailHtml({
          subject, badge: "Today", badgeColor: "#DC2626",
          rows: [
            row("Property",       prop.name),
            row("Address",        prop.address),
            row("Scheduled Date", `<strong>${fmtCheckout(job.scheduledDate)}</strong>`),
            row("Notes",          job.notes || "—"),
          ],
          note: `Good morning! You have a garbage pickup today at <strong>${prop.name}</strong>.`,
          cta: tabLink("myjobs", "View My Jobs"),
        });
        await Promise.all([
          db.ref(`garbageJobs/${job.id}/reminderMorningOf`).set(true),
          notifyWorker(job.worker, subject, html),
        ]);
      }
    }
  });

// ─── AUTO iCAL SYNC (every 30 minutes) ───────────────────────────────────────

function parseIcalText(text) {
  const events = [];
  const re = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const b = m[1];
    const summary = (b.match(/SUMMARY:([^\r\n]+)/)?.[1] || "").trim();
    if (/not available|blocked|unavailable/i.test(summary)) continue;
    const ds = b.match(/DTSTART(?:;[^\r\n:]*)?:(\d{8})/)?.[1];
    const de = b.match(/DTEND(?:;[^\r\n:]*)?:(\d{8})/)?.[1];
    const uid = b.match(/UID:([^\r\n]+)/)?.[1]?.trim();
    if (ds && de) {
      const fmt = d => `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
      const start = fmt(ds), end = fmt(de);
      const nights = Math.round((new Date(end) - new Date(start)) / 86400000);
      events.push({ start, end, nights, uid: uid || `${ds}_${de}` });
    }
  }
  return events.sort((a, b) => a.start.localeCompare(b.start));
}

const icalSafeKey = s => String(s).replace(/[.#$[\]/]/g, "_").slice(0, 200);

function icalWindowTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1]), min = parseInt(m[2]);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d, h, min, 0).getTime();
}

async function fetchIcalDirect(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CalendarSync/1.0)" } });
    if (r.ok) {
      const t = await r.text();
      if (t.includes("BEGIN:VCALENDAR")) return t;
    }
  } catch (e) {
    console.warn(`[autoSyncIcal] Direct fetch failed: ${e.message}`);
  }
  return null;
}

exports.autoSyncIcal = functions.pubsub.schedule("*/30 * * * *")
  .timeZone("America/Toronto")
  .onRun(async () => {
    const propsSnap = await db.ref("properties").once("value");
    const properties = Object.values(propsSnap.val() || {});
    console.log(`[autoSyncIcal] Checking ${properties.length} properties`);

    for (const prop of properties) {
      if (!prop.icalUrl || !prop.id) continue;
      try {
        const text = await fetchIcalDirect(prop.icalUrl);
        if (!text) {
          console.warn(`[autoSyncIcal] Could not fetch iCal for ${prop.name} (${prop.id})`);
          continue;
        }
        const events = parseIcalText(text);
        if (events.length === 0) {
          console.log(`[autoSyncIcal] No events in iCal for ${prop.name}`);
          continue;
        }

        const staysRef = db.ref(`stays/${prop.id}`);
        const sorted = events.slice().sort((a, b) => a.start.localeCompare(b.start));
        let added = 0;

        for (const ev of events) {
          const k = icalSafeKey(ev.uid);
          await staysRef.child(k).set({ uid: ev.uid, start: ev.start, end: ev.end, nights: ev.nights, propId: prop.id });

          const jobId = `ical_${prop.id}_${k}`;
          const existingJob = await db.ref(`jobs/${jobId}`).once("value");
          if (!existingJob.val()) {
            const idx = sorted.findIndex(e => e.uid === ev.uid);
            const nextCheckin = sorted[idx + 1]?.start || null;
            const wStart = icalWindowTime(ev.end, prop.checkoutTime || "11:00 AM");
            const wEnd   = icalWindowTime(nextCheckin, prop.checkinTime || "3:00 PM");
            await db.ref(`jobs/${jobId}`).set({
              id: jobId, propertyId: prop.id, checkoutDate: ev.end, checkinDate: nextCheckin,
              status: "pending", cleaner: null, arrivedAt: null, completedAt: null,
              photos: 0, windowStart: wStart || null, windowEnd: wEnd || null,
              overdueAlertSent: false, createdAt: new Date().toISOString(),
            });
            added++;
          }
        }

        await db.ref(`properties/${prop.id}`).update({ lastSynced: new Date().toISOString() });
        console.log(`[autoSyncIcal] ${prop.name} — ${events.length} bookings, ${added} new job(s)`);
      } catch (e) {
        console.error(`[autoSyncIcal] Error syncing ${prop.name}:`, e.message);
      }
    }
  });

// ─── AUTO GARBAGE SCHEDULING (daily 10 AM Toronto) ───────────────────────────
// Runs daily so that new bookings get a garbage job created within 24 hours.
// For each property, scans ALL future stays and creates a garbage job for every
// Sunday whose week (Mon–Sun) overlaps a booking — months in advance.

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function sundayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  return addDays(dateStr, dow === 0 ? 0 : 7 - dow);
}

exports.autoScheduleGarbage = functions.pubsub.schedule("0 10 * * *")
  .timeZone("America/Toronto")
  .onRun(async () => {
    const todayStr = tzDateStr(0);
    console.log(`[autoScheduleGarbage] Running for ${todayStr}`);

    const propsSnap = await db.ref("properties").once("value");
    const properties = Object.values(propsSnap.val() || {});

    for (const prop of properties) {
      if (!prop.id || !prop.garbageWorker) continue;

      const staysSnap = await db.ref(`stays/${prop.id}`).once("value");
      const stays = Object.values(staysSnap.val() || {});

      // Build the set of all Sundays that need a garbage job
      const sundaysNeeded = new Set();
      for (const stay of stays) {
        if (!stay.start || !stay.end) continue;
        if (stay.end < todayStr) continue; // fully in the past, skip

        // Sunday of the week that contains check-in → Sunday of the week that contains checkout
        let cur = sundayOfWeek(stay.start);
        const last = sundayOfWeek(stay.end);
        while (cur <= last) {
          if (cur >= todayStr) sundaysNeeded.add(cur);
          cur = addDays(cur, 7);
        }
      }

      // Create a job for every Sunday that doesn't already have one
      let created = 0;
      for (const sundayStr of sundaysNeeded) {
        const jobId = `auto_garbage_${prop.id}_${sundayStr}`;
        const existing = await db.ref(`garbageJobs/${jobId}`).once("value");
        if (existing.val()) continue;

        const now = new Date().toISOString();
        await db.ref(`garbageJobs/${jobId}`).set({
          id: jobId,
          propertyId: prop.id,
          scheduledDate: sundayStr,
          worker: prop.garbageWorker,
          status: "pending",
          notes: "",
          pickupType: "",
          createdBy: "System (auto-schedule)",
          createdAt: now,
          updatedAt: now,
        });
        created++;
        console.log(`[autoScheduleGarbage] Created job for ${prop.name} → ${prop.garbageWorker} on ${sundayStr}`);
      }
      if (created > 0) console.log(`[autoScheduleGarbage] ${prop.name} — ${created} new job(s) scheduled`);
    }
  });
