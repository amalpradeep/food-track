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
  getDay,
  parseISO,
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
  const [userCount, setUserCount] = useState(0);
  const [missingDates, setMissingDates] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [dailyStats, setDailyStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealDate, setMealDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mealMenu, setMealMenu] = useState('');
  const [savingMeal, setSavingMeal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [sendingNotify, setSendingNotify] = useState(false);


  // NEW: selectedDate state with default today
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const activeDate = selectedDate;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const userSnaps = await getDocs(collection(db, 'users'));
      const userData = [];
      const missingSet = new Set();
      const stats = {};
      let overallCount = 0;
      let filteredUserCount = 0;

      for (const userSnap of userSnaps.docs) {
        const uid = userSnap.id;
        const {
          name,
          email,
          locked = false,
          startDate = '',
          category = 'medium',
          role = 'user',
        } = userSnap.data();

        if (role === 'admin') continue;
        filteredUserCount++;

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

        // Use activeDate from selectedDate state
        const type = ['small', 'medium', 'large'].includes(category)
          ? category
          : 'medium';

        stats[activeDate] = stats[activeDate] || {
          small: 0,
          medium: 0,
          large: 0,
          total: 0,
        };
        if (bookings[activeDate] !== false) {
          stats[activeDate][type]++;
          stats[activeDate].total++;
        }

        userData.push({
          uid,
          name: name || email,
          category: category,
          count: userMonthCount,
          amount: userMonthCount * 50,
          bookings,
          locked,
          startDate,
        });

        overallCount += userMonthCount;
      }

      setUsers(userData);
      setUserCount(filteredUserCount);
      setTotalCount(overallCount);
      setTotalAmount(overallCount * 50);
      setDailyStats(stats);
      setMissingDates(
        [...missingSet]
          .filter((d) => {
            const day = getDay(parseISO(d));
            return day !== 0 && day !== 6;
          })
          .map((d) => format(parseISO(d), 'yyyy-MM-dd'))
          .sort()
      );

      // Add tomorrow's date to the list if it's a weekday
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDay = getDay(tomorrow);
      if (tomorrowDay !== 0 && tomorrowDay !== 6) {
        setMissingDates((prev) => [
          ...prev,
          format(tomorrow, 'yyyy-MM-dd'),
        ]);
      }
      setLoading(false);
    }

    fetchData();
  }, [month, activeDate]); // re-fetch if month or selected date changes

  const handleNotDelivered = async (date) => {
    setButtonLoading(date);

    const updates = users.map(async (user) => {
      await setDoc(doc(db, 'bookings', user.uid), { [date]: false }, { merge: true });
    });

    const cancellationRef = doc(db, 'cancellations', 'global');
    await Promise.all([
      ...updates,
      setDoc(cancellationRef, { [date]: false }, { merge: true })
    ]);

    setButtonLoading(null);
    setMonth((prev) => new Date(prev)); // refresh data
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

  const handleSaveMeal = async () => {
    if (!mealDate || !mealMenu.trim()) return alert('Please fill all fields');

    setSavingMeal(true);
    try {
      await setDoc(doc(db, 'meals', mealDate), { menu: mealMenu.trim() });
      alert('Meal saved successfully');
      setShowMealModal(false);
      setMealMenu('');
    } catch (error) {
      console.error(error);
      alert('Failed to save meal');
    } finally {
      setSavingMeal(false);
    }
  };

  const sendNotification = async (message) => {
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message || '🚨 Notification from Admin!' }),
      });
    } catch (error) {

    }
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

  const exportUsersToCSV = () => {
    const headers = [
      "User",
      "Count",
      "Category",
      "Amount (₹)",
      "Locked",
      "Start Date",
    ];

    const rows = users.map((u) => [
      u.name,
      u.count,
      u.category,
      `₹${u.amount}`,
      u.locked ? "Locked" : "Unlocked",
      u.startDate || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const fileName = `users_${now.toISOString().replace(/[:.]/g, "-")}.csv`;  

    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  return (
    <div className="mx-auto p-6 bg-white text-black min-h-screen">
      <h2 className="text-2xl font-semibold text-teal-700">Admin Dashboard</h2>
      <div className="flex items-center mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(subMonths(month, 1))} className="text-teal-600 hover:text-teal-800 text-xl">◀</button>
          <span className="font-medium">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="text-teal-600 hover:text-teal-800 text-xl">▶</button>
        </div>

        {/* Date picker input for manual active date */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            const pickedDate = e.target.value;
            const day = new Date(pickedDate).getDay();
            if (day === 0 || day === 6) {
              // If weekend, ignore selection or alert user
              alert('Weekends are disabled. Please select a weekday.');
              return;
            }
            setSelectedDate(pickedDate);
          }}
          className="border px-2 py-1 rounded ml-4"
        />
      </div>

      <p className="mb-4 text-teal-700 font-medium flex gap-3">
        Total Users (excluding admin): <span className="font-bold">{userCount}</span>

        <button onClick={() => setShowMealModal(true)} className="text-teal-600 border rounded p-1 hover:text-teal-800 text-sm font-bold">Set menu</button>
        <button
          onClick={() => setShowNotifyModal(true)}
          className="text-teal-600 border rounded p-1 hover:text-teal-800 text-sm font-bold"
        >
          Send Notify
        </button>

      </p>
      <div className="mb-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-teal-700 mb-2"> Count for the day ({activeDate})</h3>
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

      <div className="my-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-teal-700 mb-2">Skipped Users on {activeDate}</h3>
        <div className="grid grid-cols-3 gap-4">
          {['small', 'medium', 'large'].map((cat) => {
            const skippedUsers = users
              .filter(u => u.category === cat && u.bookings?.[activeDate] === false)
              .map(u => u.name || 'Unnamed');
            return (
              <div key={cat} className="bg-red-100 p-4 rounded shadow">
                <h4 className="text-md font-bold capitalize mb-2">{cat}</h4>
                {skippedUsers.length === 0 ? (
                  <p className="text-sm text-gray-600">No Skips</p>
                ) : (
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {skippedUsers.map((name, index) => (
                      <li key={index}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <button className='bg-teal-400 flex justify-self-end rounded mb-2 p-1.5 hover:shadow-lg hover:bg-teal-400/90 cursor-pointer text-xs text-gray-800' onClick={exportUsersToCSV}>Download CSV</button>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse mb-8">
          <thead>
            <tr className="bg-teal-100 text-left">
              <th className="border px-4 py-2">User</th>
              <th className="border px-4 py-2">Count</th>
              <th className="border px-4 py-2">Category</th>
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
                <td className="border px-4 py-2">{u.category}</td>
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
              <td className="border px-4 py-2"></td>
              <td className="border px-4 py-2">₹{totalAmount}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="border border-teal-300 rounded-xl p-4 bg-teal-50">
        <h3 className="text-lg font-semibold mb-4 text-teal-800">Missing Deliveries (Working Days Only)</h3>
        {missingDates.length === 0 ? (
          <p className="text-teal-600">All deliveries are marked.</p>
        ) : (
          <ul className="space-y-3">
            {missingDates.map((date) => (
              <li key={date} className="flex items-center justify-between border-b pb-2 border-b-teal-500">
                <span className="text-black">{date}</span>
                <div className="flex gap-2">
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
      {showMealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Meal Menu</h3>

            <label className="block mb-2 text-sm font-medium text-gray-700">Select Date</label>
            <input
              type="date"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-4"
            />

            <label className="block mb-2 text-sm font-medium text-gray-700">Meal Menu</label>
            <textarea
              value={mealMenu}
              onChange={(e) => setMealMenu(e.target.value)}
              rows={4}
              className="w-full border px-3 py-2 rounded mb-4"
              placeholder="Enter meal items..."
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowMealModal(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMeal}
                disabled={savingMeal}
                className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 text-sm"
              >
                {savingMeal ? 'Saving...' : 'Save Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Send Notification</h3>

            <label className="block mb-2 text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              rows={4}
              className="w-full border px-3 py-2 rounded mb-4"
              placeholder="Type your notification..."
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNotifyModal(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!notifyMessage.trim()) {
                    alert('Message is empty');
                    return;
                  }
                  setSendingNotify(true);
                  await sendNotification(notifyMessage.trim());
                  setNotifyMessage('');
                  setShowNotifyModal(false);
                  setSendingNotify(false);
                }}
                disabled={sendingNotify}
                className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 text-sm"
              >
                {sendingNotify ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
