self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  if (self.clients && self.clients.claim) {
    event.waitUntil(self.clients.claim());
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
});

/* -- Receive Web-Push -- */
self.addEventListener("push", (event) => {
  const data = event.data ? safeJson(event.data.text()) : {};

  const {
    title = "Levigram",
    body = "New post",
    url = "/",
    icon = "/icons/icon-192x192.png",
    badge = "/icons/badge-96x96.png", // Android/Chrome: separate Badge-Icon
  } = data;

  console.info("[Levigram push] Push event received");

  // Start displaying the notification immediately. Badge APIs and client
  // enumeration are optional and must never delay the user-visible push.
  const notificationPromise = self.registration
    .showNotification(title, {
      body,
      icon,
      badge,
      tag: "levigram-new-post",
      data: { url },
    })
    .then(() => {
      console.info("[Levigram push] Notification displayed");
    })
    .catch((error) => {
      console.error("[Levigram push] Could not display notification", error);
      throw error;
    });

  const indicatorPromise = updateAppIndicatorsForPush()
    .then((visibleAppClient) => {
      // When the app is already foregrounded, let it clear the notification
      // after showNotification has completed, avoiding a close-before-show race.
      if (visibleAppClient) {
        notificationPromise
          .then(() => {
            visibleAppClient.postMessage({ type: "LEVI_NEW_POST_RECEIVED" });
          })
          .catch(() => {
            // The notification failure is logged by notificationPromise.
          });
      }
    })
    .catch((error) => {
      // A badge failure must not prevent or reject notification delivery.
      console.warn("[Levigram push] Could not update app badge", error);
    });

  event.waitUntil(Promise.allSettled([notificationPromise, indicatorPromise]));
});

async function updateAppIndicatorsForPush() {
  let appClients;
  try {
    appClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
  } catch {
    console.warn("[Levigram push] Could not inspect app clients");
    return undefined;
  }

  const visibleAppClient = appClients.find(
    (client) =>
      client.visibilityState === "visible" &&
      client.url.startsWith(self.registration.scope)
  );

  // Android derives its launcher dot from the active notification. Platforms
  // with the Badging API (including installed iOS web apps) get a dot marker.
  if (!visibleAppClient && typeof self.navigator?.setAppBadge === "function") {
    try {
      await self.navigator.setAppBadge();
      console.info("[Levigram push] App badge set");
    } catch (error) {
      console.warn("[Levigram push] App badge API failed", error);
    }
  }

  return visibleAppClient;
}

/* -- Handle notification click -- */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const appClient = allClients.find(
        (c) => c.url && c.url.includes(self.registration.scope)
      );
      if (appClient) {
        await appClient.focus();
        try {
          await appClient.navigate(target);
        } catch (e) {}
        return;
      }

      await clients.openWindow(target);
    })()
  );
});

/* -- Helper: robust JSON -- */
function safeJson(textPromise) {
  try {
    const t = typeof textPromise === "string" ? textPromise : "";
    return JSON.parse(t || "{}");
  } catch {
    return {};
  }
}
