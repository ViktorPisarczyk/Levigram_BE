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

self.addEventListener("fetch", (event) => {});

/* -- Receive Web-Push -- */
self.addEventListener("push", (event) => {
  const data = event.data ? safeJson(event.data.text()) : {};

  const {
    title = "Levigram",
    body = "New post",
    url = "/",
    icon = "/icons/icon-192x192.png",
    badge = "/icons/icon-192x192.png", // Android/Chrome: separate Badge-Icon
  } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
    })
  );
});

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
