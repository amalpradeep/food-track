'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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
  isBefore,
  setHours,
  setMinutes,
  parseISO,
  getDay,
} from 'date-fns';

function getWorkingDays(startDate, month) {
  const start = startOfMonth(month);
  const end = isSameMonth(month, new Date()) ? new Date() : endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  return days
    .filter((day) => {
      const dayOfWeek = getDay(day);
      return day >= startDate && dayOfWeek !== 0 && dayOfWeek !== 6;
    })
    .map((d) => format(d, 'yyyy-MM-dd'));
}

export default function AdminDashboard() {
  const [month, setMonth] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [userCount, setUserCount] = useState(0); // 🆕 Count of non-admin users
  const [missingDates, setMissingDates] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [dailyStats, setDailyStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(null);

  const now = new Date();
  const cutoffTime = setMinutes(setHours(new Date(), 15), 0);
  const today = now;
  const activeDate = isBefore(today, cutoffTime)
    ? format(today, 'yyyy-MM-dd')
    : format(addMonths(today, 0).setDate(today.getDate() + 1), 'yyyy-MM-dd');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const userSnaps = await getDocs(collection(db, 'users'));
      const userData = [];
      const missingSet = new Set();
      const stats = {};
      let overallCount = 0;
      let filteredUserCount = 0; // 🆕

      for (const userSnap of userSnaps.docs) {
        const uid = userSnap.id;
        const {
          name,
          email,
          locked = false,
          startDate = '',
          category = 'medium',
          role = 'user', // 🆕 fallback to 'user'
        } = userSnap.data();

        if (role === 'admin') continue; // 🛑 Skip admin
        filteredUserCount++; // ✅ Count regular user

        const bookingSnap = await getDoc(doc(db, 'bookings', uid));
        const bookings = bookingSnap.exists() ? bookingSnap.data() : {};

        const parsedStartDate = startDate ? parseISO(startDate) : null;
        const workingDays = parsedStartDate
          ? getWorkingDays(parsedStartDate, month)
          : [];

        let deliveredCount = 0;

        for (const date of workingDays) {
          if (bookings[date] === false) {
            deliveredCount++;
          } else {
            missingSet.add(date);
          }
        }

        const userMonthCount = workingDays.length - deliveredCount;

        if (
          workingDays.includes(activeDate) &&
          !(bookings[activeDate] === false)
        ) {
          const type =
            ['small', 'medium', 'large'].includes(category) ? category : 'medium';

          stats[activeDate] = stats[activeDate] || {
            small: 0,
            medium: 0,
            large: 0,
            total: 0,
          };

          stats[activeDate][type]++;
          stats[activeDate].total++;
        }

        userData.push({
          uid,
          name: name || email,
          count: userMonthCount,
          amount: userMonthCount * 50,
          bookings,
          locked,
          startDate,
        });

        overallCount += userMonthCount;
      }

      setUsers(userData);
      setUserCount(filteredUserCount); // ✅ update count state
      setTotalCount(overallCount);
      setTotalAmount(overallCount * 50);
      setDailyStats(stats);
      setMissingDates(
        [...missingSet]
          .filter((d) => {
            const day = getDay(parseISO(d));
            return day !== 0 && day !== 6;
          })
          .sort()
      );
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
      await setDoc(doc(db, 'bookings', user.uid), { [date]: false }, { merge: true });
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

  const toggleLock = async (uid, currentStatus) => {
    setButtonLoading(uid);
    await updateDoc(doc(db, 'users', uid), { locked: !currentStatus });
    setButtonLoading(null);
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, locked: !currentStatus } : u))
    );
  };

  const updateStartDate = async (uid, value) => {
    setButtonLoading(uid);
    await updateDoc(doc(db, 'users', uid), { startDate: value });
    setButtonLoading(null);
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, startDate: value } : u))
    );
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
    <div className="mx-auto p-6 bg-white text-black min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-teal-700">Admin Dashboard</h2>
        <div className="flex items-center gap-4">
          <button onClick={() => setMonth(subMonths(month, 1))} className="text-teal-600 hover:text-teal-800 text-xl">◀</button>
          <span className="font-medium">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="text-teal-600 hover:text-teal-800 text-xl">▶</button>
        </div>
      </div>

      <p className="mb-4 text-teal-700 font-medium">
        Total Users (excluding admin): <span className="font-bold">{userCount}</span>
      </p>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-teal-700 mb-2">Today’s Count ({activeDate})</h3>
        <div className="grid grid-cols-4 gap-4">
          {['small', 'medium', 'large', 'total'].map((cat) => (
            <div key={cat} className="bg-teal-100 p-4 rounded shadow text-center">
              <h4 className="text-md font-bold capitalize">{cat}</h4>
              <p className="text-xl font-semibold">
                {dailyStats[activeDate]?.[cat] || 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-teal-100 text-left">
            <th className="border px-4 py-2">User</th>
            <th className="border px-4 py-2">Count</th>
            <th className="border px-4 py-2">Amount (₹)</th>
            <th className="border px-4 py-2">Locked</th>
            <th className="border px-4 py-2">Start Date</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid} className="border-t">
              <td className="border px-4 py-2">{u.name}</td>
              <td className="border px-4 py-2">{u.count}</td>
              <td className="border px-4 py-2">₹{u.amount}</td>
              <td className="border px-4 py-2">
                <button
                  onClick={() => toggleLock(u.uid, u.locked)}
                  className={`px-2 py-1 text-sm cursor-pointer rounded ${u.locked ? 'bg-red-500' : 'bg-green-500'} text-white`}
                >
                  {u.locked ? 'Locked' : 'Unlocked'}
                </button>
              </td>
              <td className="border px-4 py-2">
                <input
                  type="date"
                  value={u.startDate || ''}
                  onChange={(e) => updateStartDate(u.uid, e.target.value)}
                  className="border px-2 py-1 rounded"
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-teal-100 font-semibold">
            <td className="border px-4 py-2">Total</td>
            <td className="border px-4 py-2">{totalCount}</td>
            <td className="border px-4 py-2">₹{totalAmount}</td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>

      <div className="border border-teal-300 rounded-xl p-4 bg-teal-50">
        <h3 className="text-lg font-semibold mb-4 text-teal-800">Missing Deliveries (Working Days Only)</h3>
        {missingDates.length === 0 ? (
          <p className="text-teal-600">All deliveries are marked.</p>
        ) : (
          <ul className="space-y-3">
            {missingDates.map((date) => (
              <li key={date} className="flex items-center justify-between">
                <span className="text-black">{date}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMarkAsDelivered(date)}
                    disabled={buttonLoading === date}
                    className={`${buttonLoading === date ? 'opacity-50' : ''} bg-teal-600 text-white px-3 py-1 rounded text-sm`}
                  >
                    {buttonLoading === date ? 'Updating...' : 'Mark as Delivered'}
                  </button>
                  <button
                    onClick={() => handleNotDelivered(date)}
                    disabled={buttonLoading === date}
                    className={`${buttonLoading === date ? 'opacity-50' : ''} bg-red-500 text-white px-3 py-1 rounded text-sm`}
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
