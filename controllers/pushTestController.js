// Dependencies are injected so tests never send real notifications.
export function createPushTestHandler({ Subscription, sendPush, buildNotificationPayload, logger = console }) {
  return async function testPush(req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ message: "Bitte zuerst anmelden." });
      const endpoint = req.body?.endpoint;
      if (typeof endpoint !== "string" || !endpoint || endpoint.length > 4096) {
        return res.status(400).json({ message: "Ungültige Geräte-Anmeldung." });
      }
      // Never accept a user ID or arbitrary subscription keys from the caller.
      const doc = await Subscription.findOne({ user: req.user, "sub.endpoint": endpoint }).lean();
      if (!doc) return res.status(404).json({ message: "Dieses Gerät ist nicht für dein Konto angemeldet. Bitte erneut aktivieren." });
      let service = "unknown";
      try { service = new URL(doc.sub.endpoint).hostname; } catch { /* reported by sender */ }
      const context = { subscriptionId: String(doc._id), service };
      let result;
      try {
        result = await sendPush(doc.sub, buildNotificationPayload({
          title: "Levigram Push-Test",
          body: "Die Testnachricht ist auf diesem Gerät angekommen.",
          url: "/push-test",
        }));
      } catch (error) {
        const statusCode = Number(error?.statusCode) || null;
        // Do not log errors verbatim: they may contain endpoint tokens and keys.
        const reason = statusCode === 401 || statusCode === 403 ? "push-auth-rejected"
          : statusCode === 429 ? "rate-limited"
          : statusCode >= 500 ? "push-service-unavailable"
          : statusCode ? "push-request-rejected" : "network-or-configuration-error";
        logger.error("[push-test] failed", { ...context, statusCode, reason });
        return res.status(502).json({ outcome: "failed", service, statusCode, reason,
          message: "Der Push-Dienst hat die Nachricht nicht angenommen. Bitte dieses Ergebnis zur Fehlersuche weitergeben." });
      }
      if (result.gone) {
        await Subscription.findOneAndDelete({ _id: doc._id, user: req.user });
        logger.warn("[push-test] expired", context);
        return res.status(410).json({ outcome: "expired", service,
          message: "Die Geräte-Anmeldung ist abgelaufen. Setze die Benachrichtigungsberechtigung in den Website-Einstellungen zurück und aktiviere sie danach erneut." });
      }
      logger.info("[push-test] accepted", context);
      return res.json({ outcome: "accepted", service,
        message: "Der Push-Dienst hat die Nachricht angenommen. Prüfe jetzt, ob auf diesem Gerät eine Benachrichtigung erscheint. Die Annahme bestätigt noch nicht die Anzeige." });
    } catch (error) { next(error); }
  };
}
