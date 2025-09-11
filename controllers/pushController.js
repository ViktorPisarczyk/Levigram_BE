import { Subscription } from "../models/subscriptionModel.js";
import { sendPush, buildNotificationPayload } from "../config/webpush.js";

export async function subscribe(req, res, next) {
  try {
    const sub = req.body;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({ message: "Invalid subscription payload" });
    }

    await Subscription.findOneAndUpdate(
      { "sub.endpoint": sub.endpoint },
      { sub, updatedAt: Date.now() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.sendStatus(201);
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
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value?.gone) {
        deletions.push(
          Subscription.findOneAndDelete({
            "sub.endpoint": subs[i].sub.endpoint,
          })
        );
      }
    });
    if (deletions.length) await Promise.all(deletions);

    return res.json({ ok: true, sent: subs.length });
  } catch (err) {
    next(err);
  }
}
