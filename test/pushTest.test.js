import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPushTestHandler } from '../controllers/pushTestController.js';

function setup({ found = true, sendError, gone = false } = {}) {
  const sent = [], deleted = [], queries = [], logs = [];
  const doc = { _id: 'device-a', sub: { endpoint: 'https://fcm.googleapis.com/secret-token', keys: { auth: 'secret-key' } } };
  const handler = createPushTestHandler({
    Subscription: {
      findOne(query) { queries.push(query); return { lean: async () => found ? doc : null }; },
      async findOneAndDelete(query) { deleted.push(query); },
    },
    async sendPush(sub, payload) { sent.push({ sub, payload }); if (sendError) throw sendError; return { ok: !gone, gone }; },
    buildNotificationPayload: (p) => p,
    logger: Object.fromEntries(['info','warn','error'].map((key) => [key, (...args) => logs.push(args)])),
  });
  const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  return { handler, res, doc, sent, deleted, queries, logs };
}
const invoke = async (s, req = { user: 'user-a', body: { endpoint: s.doc.sub.endpoint } }) => s.handler(req, s.res, (e) => { throw e; });
test('sends exactly once to an owned stored subscription, without creating a post', async () => {
  const s = setup(); await invoke(s);
  assert.deepEqual(s.queries, [{user:'user-a', 'sub.endpoint':s.doc.sub.endpoint}]);
  assert.equal(s.sent.length, 1);
  assert.deepEqual(s.sent[0].sub, s.doc.sub);
  assert.equal(s.sent[0].payload.url, '/push-test');
  assert.equal(s.res.data.outcome, 'accepted');
  assert.equal(s.res.data.service, 'fcm.googleapis.com');
});
test('unknown or other-user endpoint cannot trigger a send', async () => {
  const s=setup({found:false}); await invoke(s);
  assert.equal(s.res.code,404); assert.equal(s.sent.length,0);
});
test('requires a login and rejects malformed input', async () => {
  const s=setup(); await invoke(s,{body:{endpoint:s.doc.sub.endpoint}});
  assert.equal(s.res.code,401); assert.equal(s.sent.length,0);
  await invoke(s,{user:'user-a',body:{endpoint:{$ne:null}}});
  assert.equal(s.res.code,400); assert.equal(s.queries.length,0);
});
test('expired subscription is removed only for the current owner', async () => {
  const s=setup({gone:true}); await invoke(s);
  assert.equal(s.res.code,410);
  assert.deepEqual(s.deleted,[{_id:'device-a',user:'user-a'}]);
});
test('authentication failure is distinguishable and secrets never reach response or logs', async () => {
  const s=setup({sendError:Object.assign(new Error('secret-token secret-key'),{statusCode:403})}); await invoke(s);
  assert.equal(s.res.code,502); assert.equal(s.res.data.reason,'push-auth-rejected');
  const output=JSON.stringify({response:s.res.data,logs:s.logs});
  assert.ok(!output.includes('secret-token')); assert.ok(!output.includes('secret-key'));
  assert.equal(s.deleted.length,0);
});
test('network errors are reported without claiming delivery', async () => {
  const s=setup({sendError:new Error('network')}); await invoke(s);
  assert.equal(s.res.code,502); assert.equal(s.res.data.outcome,'failed');
  assert.equal(s.res.data.reason,'network-or-configuration-error');
});
