import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { db } from './firebase';

type DoseStatus = 'taken' | 'missed';

type Dose = {
  key: string;
  medicineId: string;
  name: string;
  notes?: string;
  time: string;
  status?: DoseStatus;
  actualTakenAt?: string | null;
};

type Medicine = {
  id: string;
  name: string;
  notes?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  times: string[];
};

const localDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const localDateTime = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const formatTime = (time: string) =>
  new Date('2000-01-01T' + time).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

const doseId = (medicineId: string, date: string, time: string) =>
  [date, medicineId, time.replace(':', '')].join('_');

export default function App() {
  const [tab, setTab] = useState<'today' | 'medicines'>('today');
  const [doses, setDoses] = useState<Dose[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [actualTakenAt, setActualTakenAt] = useState(localDateTime());
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<Medicine> | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    const today = localDate();

    try {
      const [medicineSnapshot, logSnapshot] = await Promise.all([
        getDocs(collection(db, 'medicines')),
        getDocs(query(collection(db, 'doseLogs'), where('scheduledDate', '==', today))),
      ]);

      const medicineList = medicineSnapshot.docs
        .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Medicine)
        .sort((a, b) => a.name.localeCompare(b.name));

      const logs = new Map(
        logSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()]),
      );

      const dayDoses = medicineList
        .filter(
          (medicine) =>
            medicine.active &&
            (!medicine.startDate || medicine.startDate <= today) &&
            (!medicine.endDate || medicine.endDate >= today),
        )
        .flatMap((medicine) =>
          [...medicine.times].sort().map((time) => {
            const key = doseId(medicine.id, today, time);
            const log = logs.get(key);

            return {
              key,
              medicineId: medicine.id,
              name: medicine.name,
              notes: medicine.notes,
              time,
              status: log?.status as DoseStatus | undefined,
              actualTakenAt: log?.actualTakenAt,
            };
          }),
        )
        .sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));

      setMedicines(medicineList);
      setDoses(dayDoses);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load medicines.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const now = new Date().toTimeString().slice(0, 5);
  const pending = doses.filter((dose) => !dose.status);
  const next = useMemo(
    () => pending.find((dose) => dose.time >= now) || pending[0],
    [doses, now],
  );

  useEffect(() => {
    setActualTakenAt(localDateTime());
  }, [next?.key]);

  const mark = async (dose: Dose, status: DoseStatus) => {
    setBusy(true);
    setError('');

    try {
      await setDoc(doc(db, 'doseLogs', dose.key), {
        medicineId: dose.medicineId,
        scheduledDate: localDate(),
        scheduledTime: dose.time,
        status,
        actualTakenAt: status === 'taken' ? new Date(actualTakenAt).toISOString() : null,
        updatedAt: new Date().toISOString(),
      });
      await load();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Unable to save dose.');
    } finally {
      setBusy(false);
    }
  };

  const saveMedicine = async () => {
    if (!editing?.name?.trim() || !editing.times?.length) return;

    setBusy(true);
    setError('');

    const data = {
      name: editing.name.trim(),
      notes: editing.notes?.trim() || '',
      active: editing.active ?? true,
      startDate: editing.startDate || '',
      endDate: editing.endDate || '',
      times: [...new Set(editing.times)].sort(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editing.id) {
        await updateDoc(doc(db, 'medicines', editing.id), data);
      } else {
        await addDoc(collection(db, 'medicines'), {
          ...data,
          createdAt: new Date().toISOString(),
        });
      }

      setEditing(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save medicine.');
    } finally {
      setBusy(false);
    }
  };

  const removeMedicine = async () => {
    if (!editing?.id) return;

    setBusy(true);
    try {
      await deleteDoc(doc(db, 'medicines', editing.id));
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
      <header className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Medicine</h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString([], {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <button
          onClick={() => setTab(tab === 'today' ? 'medicines' : 'today')}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
        >
          {tab === 'today' ? 'Manage' : 'Today'}
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      )}

      {tab === 'today' ? (
        <>
          {next ? (
            <section className="mb-7 rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Next medicine
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-bold">{next.name}</h2>
                  <p className="mt-1 text-slate-500">{next.notes}</p>
                </div>
                <div className="whitespace-nowrap text-2xl font-semibold">
                  {formatTime(next.time)}
                </div>
              </div>

              <label className="mt-7 block text-sm text-slate-500">Actually taken at</label>
              <input
                type="datetime-local"
                value={actualTakenAt}
                onChange={(event) => setActualTakenAt(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-base"
              />
              <button
                disabled={busy}
                onClick={() => mark(next, 'taken')}
                className="mt-4 w-full rounded-2xl bg-slate-900 py-4 text-lg font-semibold text-white disabled:opacity-50"
              >
                ✓ Confirm taken
              </button>
              <button
                disabled={busy}
                onClick={() => mark(next, 'missed')}
                className="mt-2 w-full py-3 text-sm text-slate-500"
              >
                Mark as missed
              </button>
            </section>
          ) : (
            <section className="mb-7 rounded-3xl border border-slate-200 bg-white p-8 text-center">
              <div className="text-3xl">✓</div>
              <h2 className="mt-2 text-xl font-semibold">All done for today</h2>
            </section>
          )}

          <section>
            <h3 className="mb-3 font-semibold">Today's schedule</h3>
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {doses.map((dose) => (
                <div key={dose.key} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-20 text-sm font-medium">{formatTime(dose.time)}</span>
                  <span className={'flex-1 ' + (dose.status ? 'text-slate-400' : '')}>
                    {dose.name}
                  </span>
                  <span
                    className={
                      'text-xs font-medium ' +
                      (dose.status === 'taken'
                        ? 'text-emerald-600'
                        : dose.status === 'missed'
                        ? 'text-rose-500'
                        : 'text-slate-400')
                    }
                  >
                    {dose.status === 'taken'
                      ? 'Taken'
                      : dose.status === 'missed'
                      ? 'Missed'
                      : dose.time < now
                        ? 'Due'
                        : 'Upcoming'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Medicines & schedules</h2>
            <button
              onClick={() =>
                setEditing({ name: '', notes: '', times: ['08:00'], active: true })
              }
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
            >
              + Add
            </button>
          </div>

          <div className="space-y-3">
            {medicines.map((medicine) => (
              <div
                key={medicine.id}
                className={
                  'rounded-2xl border border-slate-200 bg-white p-4 ' +
                  (!medicine.active ? 'opacity-50' : '')
                }
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{medicine.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {medicine.times.map(formatTime).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing({ ...medicine })}
                    className="text-sm font-medium"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {editing && (
        <div className="fixed inset-0 z-10 flex items-end bg-black/30 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <div className="mb-5 flex justify-between">
              <h2 className="text-lg font-semibold">
                {editing.id ? 'Edit medicine' : 'Add medicine'}
              </h2>
              <button onClick={() => setEditing(null)}>✕</button>
            </div>

            <label className="text-sm text-slate-500">Medicine name</label>
            <input
              value={editing.name || ''}
              onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              className="mb-4 mt-1 w-full rounded-xl border border-slate-200 p-3"
            />

            <label className="text-sm text-slate-500">Notes</label>
            <input
              value={editing.notes || ''}
              onChange={(event) => setEditing({ ...editing, notes: event.target.value })}
              className="mb-4 mt-1 w-full rounded-xl border border-slate-200 p-3"
            />

            <div className="mb-2 flex justify-between">
              <label className="text-sm text-slate-500">Daily times</label>
              <button
                onClick={() =>
                  setEditing({ ...editing, times: [...(editing.times || []), '12:00'] })
                }
                className="text-sm font-medium"
              >
                + Time
              </button>
            </div>

            <div className="space-y-2">
              {editing.times?.map((time, index) => (
                <div className="flex gap-2" key={index}>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => {
                      const times = [...(editing.times || [])];
                      times[index] = event.target.value;
                      setEditing({ ...editing, times });
                    }}
                    className="flex-1 rounded-xl border border-slate-200 p-3"
                  />
                  <button
                    onClick={() =>
                      setEditing({
                        ...editing,
                        times: editing.times?.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                    className="px-3 text-slate-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Start date (optional)</label>
                <input
                  type="date"
                  value={editing.startDate || ''}
                  onChange={(event) => setEditing({ ...editing, startDate: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">End date (optional)</label>
                <input
                  type="date"
                  value={editing.endDate || ''}
                  onChange={(event) => setEditing({ ...editing, endDate: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                />
              </div>
            </div>

            {editing.id && (
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editing.active}
                  onChange={(event) => setEditing({ ...editing, active: event.target.checked })}
                />
                Active
              </label>
            )}

            <button
              disabled={busy || !editing.name || !editing.times?.length}
              onClick={saveMedicine}
              className="mt-5 w-full rounded-2xl bg-slate-900 py-4 font-semibold text-white disabled:opacity-40"
            >
              Save medicine
            </button>

            {editing.id && (
              <button
                disabled={busy}
                onClick={removeMedicine}
                className="mt-2 w-full py-3 text-sm text-rose-600"
              >
                Remove medicine
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
