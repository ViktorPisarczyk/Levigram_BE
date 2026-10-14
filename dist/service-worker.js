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

  event.waitUntil(
    (async () => {
      const visibleAppClient = await setBadgeForBackgroundPush();

      await self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag: "levigram-new-post",
        data: { url },
      });

      // Android uses active notifications for its launcher dot. Tell an
      // already-open app to dismiss this notification so it stays in sync.
      if (visibleAppClient) {
        visibleAppClient.postMessage({ type: "LEVI_NEW_POST_RECEIVED" });
      }
    })()
  );
});

async function setBadgeForBackgroundPush() {
  try {
    const appClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const visibleAppClient = appClients.find(
      (client) =>
        client.visibilityState === "visible" &&
        client.url.startsWith(self.registration.scope)
    );

    // Android derives its launcher dot from active notifications; the
    // Badging API is used by supported platforms such as iOS Home Screen apps.
    if (
      !visibleAppClient &&
      typeof self.navigator?.setAppBadge === "function"
    ) {
      await self.navigator.setAppBadge(1);
    }

    return visibleAppClient;
  } catch {
    // Badge support is optional; it must not prevent the push notification.
    return undefined;
  }
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
