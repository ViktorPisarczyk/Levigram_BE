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

// Keep new-post notifications available while devices are temporarily offline.
const DEFAULT_TTL = 60 * 60 * 24;

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
      urgency: "high",
      timeout: 10_000,
    });
    return { ok: true };
  } catch (err) {
    // 404/410 = Subscription no longer exists (e.g. app deleted)
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      console.info("[webpush] Removing expired subscription", {
        statusCode: err.statusCode,
      });
      return { ok: false, gone: true };
    }

    let providerReason;
    if (typeof err?.body === "string") {
      try {
        providerReason = JSON.parse(err.body)?.reason;
      } catch {
        // Provider responses are not always JSON.
      }
    }
    console.error("[webpush] Delivery request failed", {
      statusCode: err?.statusCode ?? null,
      code: err?.code ?? null,
      providerReason: providerReason ?? null,
    });
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
  badge = "/icons/badge-96x96.png",
} = {}) {
  return { title, body, url, icon, badge };
}
