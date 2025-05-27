'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addDays,
} from 'date-fns';

export default function AdminDashboard() {
  const [month, setMonth] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [missingDates, setMissingDates] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(null);

  const today = new Date();

  const daysForSelectedMonth = eachDayOfInterval({
    start: startOfMonth(month),
    end: isSameMonth(month, today) ? today : endOfMonth(month),
  }).map((d) => format(d, 'yyyy-MM-dd'));

  const currentMonthDaysUpToTomorrow = eachDayOfInterval({
    start: startOfMonth(today),
    end: addDays(today, 1),
  }).map((d) => format(d, 'yyyy-MM-dd'));

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const userSnaps = await getDocs(collection(db, 'users'));
      const userData = [];
      const grandMissingSet = new Set(currentMonthDaysUpToTomorrow);
      let total = 0;

      for (const snap of userSnaps.docs) {
        const uid = snap.id;
        const name = snap.data().name || snap.data().email;
        const bookingSnap = await getDoc(doc(db, 'bookings', uid));
        const bookings = bookingSnap.exists() ? bookingSnap.data() : {};
        let count = 0;

        for (const date of daysForSelectedMonth) {
          if (bookings[date] === true) count++;
        }

        for (const date of currentMonthDaysUpToTomorrow) {
          if (bookings[date] === true || bookings[date] === false) {
            grandMissingSet.delete(date);
          }
        }

        userData.push({ uid, name, count, amount: count * 50, bookings });
        total += count;
      }

      setUsers(userData);
      setMissingDates(Array.from(grandMissingSet).sort());
      setTotalCount(total);
      setTotalAmount(total * 50);
      setLoading(false);
    }

    fetchData();
  }, [month]);

  const handleMarkAsDelivered = async (date) => {
    setButtonLoading(date);
    for (const user of users) {
      const shouldSkip =
        user.bookings?.[date] === false || user.bookings?.[date] === true;
      if (shouldSkip) continue;

      await setDoc(doc(db, 'bookings', user.uid), { [date]: true }, { merge: true });
    }

    setButtonLoading(null);
    setMonth((prev) => new Date(prev));
  };

  const handleNotDelivered = async (date) => {
    setButtonLoading(date);
    for (const user of users) {
      await setDoc(doc(db, 'bookings', user.uid), { [date]: false }, { merge: true });
    }

    setButtonLoading(null);
    setMonth((prev) => new Date(prev));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-teal-600 text-xl font-semibold animate-pulse">
          Loading Admin Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 bg-white text-gray-800 h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-teal-700">Admin Dashboard</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="text-teal-600 hover:text-teal-800 text-xl"
          >
            ◀
          </button>
          <span className="font-medium">{format(month, 'MMMM yyyy')}</span>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="text-teal-600 hover:text-teal-800 text-xl"
          >
            ▶
          </button>
        </div>
      </div>

      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-teal-100 text-left">
            <th className="border px-4 py-2">User</th>
            <th className="border px-4 py-2">Count</th>
            <th className="border px-4 py-2">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid} className="border-t">
              <td className="border px-4 py-2">{u.name}</td>
              <td className="border px-4 py-2">{u.count}</td>
              <td className="border px-4 py-2">₹{u.amount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-teal-100 font-semibold">
            <td className="border px-4 py-2">Total</td>
            <td className="border px-4 py-2">{totalCount}</td>
            <td className="border px-4 py-2">₹{totalAmount}</td>
          </tr>
        </tfoot>
      </table>

      <div className="border border-teal-300 rounded-xl p-4 bg-teal-50">
        <h3 className="text-lg font-semibold mb-4 text-teal-800">
          Missing Deliveries (up to tomorrow)
        </h3>
        {missingDates.length === 0 ? (
          <p className="text-teal-600">All deliveries are marked.</p>
        ) : (
          <ul className="space-y-3">
            {missingDates.map((date) => (
              <li key={date} className="flex items-center justify-between">
                <span className="text-gray-800">{date}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMarkAsDelivered(date)}
                    disabled={buttonLoading === date}
                    className={`${
                      buttonLoading === date ? 'opacity-50' : ''
                    } bg-teal-600 text-white px-3 py-1 rounded text-sm`}
                  >
                    {buttonLoading === date ? 'Updating...' : 'Mark as Delivered'}
                  </button>
                  <button
                    onClick={() => handleNotDelivered(date)}
                    disabled={buttonLoading === date}
                    className={`${
                      buttonLoading === date ? 'opacity-50' : ''
                    } bg-red-500 text-white px-3 py-1 rounded text-sm`}
                  >
                    {buttonLoading === date ? 'Updating...' : 'Not Delivered'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
