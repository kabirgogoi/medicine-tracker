interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    try {
      if (url.pathname === '/api/medicines' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          "SELECT m.*, group_concat(t.time,'|') times FROM medicines m LEFT JOIN medicine_times t ON t.medicine_id=m.id GROUP BY m.id ORDER BY m.active DESC,m.name",
        ).all();

        return json(
          results.map((medicine: any) => ({
            ...medicine,
            times: medicine.times ? medicine.times.split('|').sort() : [],
          })),
        );
      }

      if (url.pathname === '/api/medicines' && request.method === 'POST') {
        const body: any = await request.json();

        if (!body.name?.trim() || !Array.isArray(body.times) || !body.times.length) {
          return json({ error: 'Name and at least one time are required' }, 400);
        }

        const result = await env.DB.prepare(
          'INSERT INTO medicines(name,notes,start_date,end_date) VALUES(?,?,?,?)',
        )
          .bind(
            body.name.trim(),
            body.notes || null,
            body.start_date || null,
            body.end_date || null,
          )
          .run();

        for (const time of [...new Set(body.times as string[])]) {
          await env.DB.prepare(
            'INSERT INTO medicine_times(medicine_id,time) VALUES(?,?)',
          )
            .bind(result.meta.last_row_id, time)
            .run();
        }

        return json({ ok: true }, 201);
      }

      const medicineMatch = url.pathname.match(/^\/api\/medicines\/(\d+)$/);

      if (medicineMatch && request.method === 'PUT') {
        const id = +medicineMatch[1];
        const body: any = await request.json();

        await env.DB.prepare(
          'UPDATE medicines SET name=?,notes=?,active=?,start_date=?,end_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        )
          .bind(
            body.name,
            body.notes || null,
            body.active ? 1 : 0,
            body.start_date || null,
            body.end_date || null,
            id,
          )
          .run();

        await env.DB.prepare('DELETE FROM medicine_times WHERE medicine_id=?').bind(id).run();

        for (const time of [...new Set(body.times as string[])]) {
          await env.DB.prepare(
            'INSERT INTO medicine_times(medicine_id,time) VALUES(?,?)',
          )
            .bind(id, time)
            .run();
        }

        return json({ ok: true });
      }

      if (medicineMatch && request.method === 'DELETE') {
        await env.DB.prepare(
          'UPDATE medicines SET active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        )
          .bind(+medicineMatch[1])
          .run();

        return json({ ok: true });
      }

      if (url.pathname === '/api/day' && request.method === 'GET') {
        const date = url.searchParams.get('date');

        if (!date) {
          return json({ error: 'date required' }, 400);
        }

        const { results } = await env.DB.prepare(
          'SELECT m.id medicine_id,m.name,m.notes,t.id medicine_time_id,t.time,l.status,l.actual_taken_at FROM medicines m JOIN medicine_times t ON t.medicine_id=m.id LEFT JOIN dose_logs l ON l.medicine_id=m.id AND l.scheduled_date=? AND l.scheduled_time=t.time WHERE m.active=1 AND (m.start_date IS NULL OR m.start_date<=?) AND (m.end_date IS NULL OR m.end_date>=?) ORDER BY t.time,m.name',
        )
          .bind(date, date, date)
          .all();

        return json(results);
      }

      if (url.pathname === '/api/doses' && request.method === 'POST') {
        const body: any = await request.json();

        if (!['taken', 'missed'].includes(body.status)) {
          return json({ error: 'invalid status' }, 400);
        }

        await env.DB.prepare(
          'INSERT INTO dose_logs(medicine_id,medicine_time_id,scheduled_date,scheduled_time,status,actual_taken_at) VALUES(?,?,?,?,?,?) ON CONFLICT(medicine_id,scheduled_date,scheduled_time) DO UPDATE SET status=excluded.status,actual_taken_at=excluded.actual_taken_at,updated_at=CURRENT_TIMESTAMP',
        )
          .bind(
            body.medicine_id,
            body.medicine_time_id,
            body.scheduled_date,
            body.scheduled_time,
            body.status,
            body.status === 'taken' ? body.actual_taken_at : null,
          )
          .run();

        return json({ ok: true });
      }

      return json({ error: 'Not found' }, 404);
    } catch (error: any) {
      return json({ error: error.message || 'Server error' }, 500);
    }
  },
};
