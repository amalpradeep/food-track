'use client'

import dayjs from 'dayjs';

export default function MenuSection({ menu }) {
  const now = dayjs(); // ✅ define now first

  const isBetween7AMAnd2PM =
    now.isAfter(dayjs().hour(7).minute(0)) &&
    now.isBefore(dayjs().hour(14).minute(0));

  if (!isBetween7AMAnd2PM || !menu) return null;

  return (
    <div className="my-6">
      <div className="rounded-xl border w-full justify-self-center border-yellow-200 bg-yellow-50 shadow p-4 space-y-2">
        <h2 className="text-lg font-bold text-yellow-800">Today&apos;s Menu 🍱</h2>
        <p>{menu} 🍛</p>
      </div>
    </div>
  );
}
