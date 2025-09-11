import webpush from "web-push";

// --- Ensure ENV is set ---
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  throw new Error("❌ Missing VAPID keys in environment variables");
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:viktor.pisarczyk@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Push messages should not stay in the queue forever
const DEFAULT_TTL = 300;

/**
 * Sends a Web-Push Notification
 * @param {PushSubscription} subscription - Subscription object from the browser
 * @param {Object} payload - JSON payload (e.g. {title, body, url, icon, badge})
 * @returns {Promise<{ok: boolean, gone?: boolean}>}
 */
export async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: DEFAULT_TTL,
    });
    return { ok: true };
  } catch (err) {
    // 404/410 = Subscription no longer exists (e.g. app deleted)
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      return { ok: false, gone: true };
    }
    throw err;
  }
}

/**
 * Helper function: Builds a standardized notification payload.
 * You can reuse this everywhere (e.g. for new posts).
 */
export function buildNotificationPayload({
  title = "Levigram",
  body = "New activity",
  url = "/",
  icon = "/icons/icon-192x192.png",
  badge = "/icons/icon-192x192.png",
} = {}) {
  return { title, body, url, icon, badge };
}
