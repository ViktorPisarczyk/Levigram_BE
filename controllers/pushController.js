import { Subscription } from "../models/subscriptionModel.js";
import { sendPush, buildNotificationPayload } from "../config/webpush.js";

export async function subscribe(req, res, next) {
  try {
    console.log("[subscribe] req.user =", req.user);
    if (!req.user) return res.status(401).json({ message: "Auth required" });

    const sub = req.body;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({ message: "Invalid subscription payload" });
    }

    const doc = await Subscription.findOneAndUpdate(
      { "sub.endpoint": sub.endpoint },
      { sub, user: req.user, updatedAt: Date.now() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res
      .status(201)
      .json({ ok: true, saved: { id: doc._id, user: doc.user } }); // TEMP-RESPONSE
  } catch (err) {
    next(err);
  }
}

export async function unsubscribe(req, res, next) {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint)
      return res.status(400).json({ message: "endpoint required" });

    await Subscription.findOneAndDelete({ "sub.endpoint": endpoint });
    return res.sendStatus(200);
  } catch (err) {
    next(err);
  }
}

export async function broadcast(req, res, next) {
  try {
    const payload = buildNotificationPayload(req.body?.payload || {});

    const subs = await Subscription.find().lean();
    if (!subs.length)
      return res.status(404).json({ message: "no subscriptions" });

    const results = await Promise.allSettled(
      subs.map(({ sub }) => sendPush(sub, payload))
    );

    const deletions = [];
    let accepted = 0;
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        failed += 1;
        return;
      }

      if (r.value?.gone) {
        deletions.push(
          Subscription.findOneAndDelete({
            "sub.endpoint": subs[i].sub.endpoint,
          })
        );
      } else if (r.value?.ok) {
        accepted += 1;
      }
    });
    if (deletions.length) await Promise.all(deletions);

    console.info("[push] Broadcast delivery results", {
      attempted: subs.length,
      accepted,
      expired: deletions.length,
      failed,
    });

    return res.json({
      ok: failed === 0,
      attempted: subs.length,
      sent: accepted,
      expired: deletions.length,
      failed,
    });
  } catch (err) {
    next(err);
  }
}
