'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import dayjs from 'dayjs';


function MonthCalendar({ bookings }) {
    const today = dayjs();
    const year = today.year();
    const month = today.month();
    const daysInMonth = today.daysInMonth();

    const firstDayOfWeek = dayjs(new Date(year, month, 1)).day();

    const getDotColor = (dateStr) => {
        const day = dayjs(dateStr).day(); // Sunday=0, Saturday=6
        if (bookings[dateStr] === false) return 'red'; // canceled
        if (day !== 0 && day !== 6) return 'green'; // all weekdays
        return 'none'; // no dot for weekends
    };

    const calendarDays = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarDays.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        calendarDays.push(dayjs(new Date(year, month, d)).format('YYYY-MM-DD'));
    }

    return (
        <div className="max-w-md mx-auto py-5 px-4">
            <h3 className="text-lg font-semibold mb-3 text-center">
                Booking Status
            </h3>
            <div className="grid grid-cols-7 gap-2 text-center select-none">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wd) => (
                    <div key={wd} className="font-semibold text-sm text-gray-600">
                        {wd}
                    </div>
                ))}
                {calendarDays.map((dateStr, i) =>
                    dateStr ? (
                        <div key={dateStr} className="flex flex-col items-center">
                            <span className="text-sm">{dayjs(dateStr).date()}</span>
                            {(() => {
                                const dotColor = getDotColor(dateStr);
                                if (dotColor === 'red') {
                                    return <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />;
                                } else if (dotColor === 'green') {
                                    return <span className="mt-1 h-2 w-2 rounded-full bg-green-500" />;
                                }
                                return <span className="mt-1 h-2 w-2 invisible" />;
                            })()}
                        </div>
                    ) : (
                        <div key={`empty-${i}`} />
                    )
                )}
            </div>
        </div>
    );
}




export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [bookings, setBookings] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [range, setRange] = useState([
        {
            startDate: new Date(),
            endDate: new Date(),
            key: 'selection',
        },
    ]);
    const today = new Date().toISOString().split('T')[0];

    // redirect if not authenticated
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (data) => {
            if (!data) router.push('/login');
        });
        return () => unsub();
    }, [router]);

    // fetch bookings and user data
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUserId(u);
                const ref = doc(db, 'bookings', u.uid);
                const refUser = doc(db, 'users', u.uid);

                const snap = await getDoc(ref);
                const snapUser = await getDoc(refUser);

                if (snap.exists()) setBookings(snap.data());
                if (snapUser.exists()) setUser(snapUser.data());

                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // Updated getMonthCount: counts booked weekdays from user.startDate in current month excluding false bookings
    const getMonthCount = () => {
        if (!user?.startDate) return 0;

        const start = new Date(user.startDate);
        const todayDate = new Date();
        const currentMonth = todayDate.getMonth();
        const currentYear = todayDate.getFullYear();

        let count = 0;
        const date = new Date(start);

        while (
            date <= todayDate &&
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
        ) {
            const ymd = date.toISOString().split('T')[0];
            const day = date.getDay(); // Sunday=0, Saturday=6

            // Count only weekdays (Mon-Fri) and where booking is NOT false
            if (day !== 0 && day !== 6 && bookings[ymd] !== false) {
                count++;
            }
            date.setDate(date.getDate() + 1);
        }

        return count;
    };

    // cancel today's food
    const handleCancel = async (date) => {
        const ref = doc(db, 'bookings', userId.uid);
        await setDoc(ref, { [date]: false }, { merge: true });
        setBookings((prev) => ({ ...prev, [date]: false }));
    };

    const getDateAt7AM = (d) => {
        const date = new Date(d);
        date.setHours(7, 0, 0, 0); // force 7:00 AM local time
        return date;
    };

    // logout
    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    // helper to get all dates between start and end
    const getDatesInRange = (startDate, endDate) => {
        const date = new Date(startDate);
        const dates = [];

        while (date <= endDate) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${d}`);
            date.setDate(date.getDate() + 1);
        }

        return dates;
    };

    // confirm date range cancellation
    const handleConfirmRange = async () => {
        const datesToCancel = getDatesInRange(range[0].startDate, range[0].endDate);
        const ref = doc(db, 'bookings', userId.uid);
        const updates = {};
        const now = new Date();

        datesToCancel.forEach((date) => {
            const cancelTime = getDateAt7AM(date);
            if (cancelTime > now) {
                updates[date] = false;
            }
        });

        if (Object.keys(updates).length === 0) {
            alert('No valid future dates selected.');
            return;
        }

        await setDoc(ref, updates, { merge: true });
        setBookings((prev) => ({ ...prev, ...updates }));
        setShowModal(false);
    };

    const handleUndoCancel = async (date) => {
        if (!userId) return;

        const ref = doc(db, 'bookings', userId.uid);

        await updateDoc(ref, {
            [date]: deleteField(),
        });

        setBookings((prev) => {
            const newBookings = { ...prev };
            delete newBookings[date];
            return newBookings;
        });
    };

    if (loading) return <p className="text-center mt-16 text-gray-500">Loading...</p>;

    return (
        <div className="min-h-screen bg-white text-gray-800">
            {/* Header */}
            <div className="bg-teal-600 sticky top-0 text-white py-3 px-6 flex justify-between items-center shadow">
                <h1 className="text-lg font-semibold">Aether Auth</h1>
                <button
                    onClick={handleLogout}
                    className="text-sm border border-white px-3 py-1 rounded hover:bg-white hover:text-teal-600 transition"
                >
                    Logout
                </button>
            </div>

            {user?.locked ? (
                <div className="max-w-md mx-auto py-10 px-4">
                    <div className="flex flex-col">
                        <span>Welcome, {user?.name}</span>
                        {user?.locked && (
                            <span className="mt-3 text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                                Account locked. Contact admin to approve.
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="max-w-md mx-auto py-10 px-4">
                        <div className="space-y-4 border border-gray-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium">Welcome, {user?.name || 'User'}</h2>
                            <p>
                                <span className="font-semibold text-teal-600">My Category:</span> {user?.category}
                            </p>
                            <p className='font-bold'>
                                <span className="font-semibold text-teal-600">Booked Days:</span> {getMonthCount()}
                            </p>
                            <p className='font-bold'>
                                <span className="font-semibold text-teal-600">Amount to Pay:</span> ₹{getMonthCount() * 50}
                            </p>

                            {(() => {
                                const now = dayjs();
                                const isBefore730 = now.isBefore(now.hour(7).minute(30));
                                const targetDate = isBefore730 ? dayjs().format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD');

                                const isToday = targetDate === today;
                                const alreadyCanceled = bookings[targetDate] === false;

                                if (alreadyCanceled && isToday) {
                                    return (
                                        <p className="text-red-500 text-sm font-medium">
                                            Oh' today’s food canceled
                                        </p>
                                    );
                                }

                                if (!alreadyCanceled) {
                                    return (
                                        <button
                                            onClick={() => handleCancel(targetDate)}
                                            className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition"
                                        >
                                            Cancel {isToday ? "Today's" : "Tomorrow's"} Food
                                        </button>
                                    );
                                }

                                return null;
                            })()}

                            {/* Action Links */}
                            <div className="flex justify-between text-sm pt-4 border-t border-gray-100 text-teal-700 font-medium">
                                <button onClick={() => setShowModal(true)}>Schedule Cancelation</button>
                            </div>
                        </div>
                    </div>

                    {/* Cancelled Dates Card */}
                    <div className="max-w-md mx-auto  px-4">
                        <div className="border border-red-200 rounded-xl p-6 shadow-sm bg-red-50">
                            <h3 className="text-lg font-semibold text-red-600 mb-3">Upcoming Cancellations</h3>
                            <div className="space-y-3">
                                {Object.entries(bookings)
                                    .filter(([date, booked]) => {
                                        if (booked !== false) return false;
                                        const cancelDate = new Date(date + 'T07:00:00');
                                        return cancelDate > new Date();
                                    })
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([date]) => (
                                        <div
                                            key={date}
                                            className="flex justify-between items-center bg-white border border-red-300 rounded-md p-3 shadow-sm"
                                        >
                                            <span className="text-red-700 font-medium">{date}</span>
                                            <button
                                                onClick={() => handleUndoCancel(date)}
                                                className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded"
                                            >
                                                Undo Cancel
                                            </button>
                                        </div>
                                    ))}

                                {Object.entries(bookings).filter(([date, booked]) => {
                                    const cancelDate = new Date(date + 'T07:00:00');
                                    return booked === false && cancelDate > new Date();
                                }).length === 0 && (
                                        <p className="text-gray-500">No upcoming cancellations.</p>
                                    )}
                            </div>
                        </div>
                    </div>
                    <MonthCalendar bookings={bookings} />

                </>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg">
                        <h3 className="text-lg font-semibold mb-4">Select Date Range to Cancel</h3>
                        <DateRange
                            editableDateInputs={true}
                            onChange={(item) => setRange([item.selection])}
                            moveRangeOnFirstSelection={false}
                            ranges={range}
                            minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
                        />
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRange}
                                className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 text-sm"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
