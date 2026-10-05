import type { FetchLike } from '../sync/client';
import { isSyncKey } from '../sync/key';
import { SYNC_PROTOCOL } from '../sync/protocol';
import { sanitizeEvent, type StoredEvent } from '../storage/schema';

/** In-memory twin of cloud/src/index.ts */
export class FakeSyncServer {
  rows: { seq: number; user: string; event: StoredEvent }[] = [];
  seq = 0;
  online = true;
  calls: string[] = [];

  fetch: FetchLike = async (url, init) => {
    this.calls.push(`${init.method} ${url}`);
    if (!this.online) throw new TypeError('Failed to fetch');
    const user = init.headers.Authorization?.replace('Bearer ', '') ?? '';
    const reply = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body });
    if (!isSyncKey(user)) return reply(401, {});
    const { pathname, searchParams } = new URL(url);
    if (init.method === 'POST' && pathname === '/v1/events') {
      const { events } = JSON.parse(init.body!);
      if (events.length > SYNC_PROTOCOL.maxBatch || init.body!.length > SYNC_PROTOCOL.maxBody) return reply(413, {});
      const accepted: string[] = [];
      const rejected: string[] = [];
      for (const raw of events) {
        const e = sanitizeEvent(raw);
        if (!e) { rejected.push(raw.id); continue; }
        accepted.push(e.id);
        if (!this.rows.some(r => r.user === user && r.event.id === e.id)) this.rows.push({ seq: ++this.seq, user, event: e });
      }
      return reply(200, { accepted, rejected });
    }
    if (init.method === 'GET' && pathname === '/v1/events') {
      const after = Number(searchParams.get('after'));
      const mine = this.rows.filter(r => r.user === user && r.seq > after);
      const page = mine.slice(0, SYNC_PROTOCOL.pageSize);
      return reply(200, { events: page.map(r => r.event), cursor: page.length > 0 ? page[page.length - 1].seq : after, more: mine.length > page.length });
    }
    if (init.method === 'DELETE' && pathname === '/v1/account') {
      const before = this.rows.length;
      this.rows = this.rows.filter(r => r.user !== user);
      return reply(200, { deleted: before - this.rows.length });
    }
    return reply(404, {});
  };
}

