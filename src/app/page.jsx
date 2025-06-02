'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import dayjs from 'dayjs';
import Header from '@/components/layout/Header';
import { QRCodeCanvas, Qr } from 'qrcode.react';
import Image from 'next/image';
import MenuSection from '@/components/Menu';

const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
};


function MonthCalendar({ bookings }) {
    const today = dayjs();
    const year = today.year();
    const month = today.month();
    const day = today.date();
    const daysInMonth = today.daysInMonth();
    const firstDayOfWeek = dayjs(new Date(year, month, 1)).day();

    const getDotColor = (dateStr) => {
        const date = dayjs(dateStr);
        const day = date.day();
        const isFuture = date.isAfter(today, 'day');
        const isCanceled = bookings[dateStr] === false;

        if (isCanceled) return 'red';
        if (day === 0 || day === 6) return 'none'; // skip weekends
        return isFuture ? 'yellow' : 'green';
    };

    const calendarDays = [];
    for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        calendarDays.push(dayjs(new Date(year, month, d)).format('YYYY-MM-DD'));
    }

    return (
        <div className="max-w-sm mx-auto shadow relative xl:fixed xl:right-10 mt-5">
            <div className='bg-red-600/80 text-white py-1 pl-1 rounded-t flex'>
                <div className='bg-white text-black w-1/4 text-4xl flex flex-col items-center justify-center rounded font-bold' >
                    <span className='text-xs font-thin'>Today</span>
                    {day}
                </div>
                <div className='ml-5'>
                    <h3 className="text-xs font-semibold mb-1 text-center pt-2">Booking Status</h3>
                    <h2 className="text-lg font-bold text-center mb-1">
                        {today.format('MMMM YYYY')}
                    </h2>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center select-none p-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wd) => (
                    <div key={wd} className="font-semibold text-sm text-gray-600">{wd}</div>
                ))}
                {calendarDays.map((dateStr, i) =>
                    dateStr ? (
                        <div key={dateStr} className="flex flex-col items-center">
                            <span className="text-sm">{dayjs(dateStr).date()}</span>
                            {(() => {
                                const dotColor = getDotColor(dateStr);
                                if (dotColor === 'red') return <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />;
                                if (dotColor === 'green') return <span className="mt-1 h-2 w-2 rounded-full bg-green-500" />;
                                if (dotColor === 'yellow') return <span className="mt-1 h-2 w-2 rounded-full bg-yellow-400" />;
                                return <span className="mt-1 h-2 w-2 invisible" />;
                            })()}
                        </div>
                    ) : <div key={`empty-${i}`} />
                )}
            </div>
            <div className="mt-4 flex justify-around text-sm text-gray-700  pb-5">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Booked</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-400" />
                    <span>Upcoming</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Cancelled</span>
                </div>
            </div>
        </div>
    );
}

const canEditCategory = () => {
    const now = dayjs();
    const threePM = now.hour(14).minute(30).second(0);
    const sevenThirtyAMNextDay = threePM.add(1, 'day').hour(7).minute(30).second(0);

    return now.isAfter(threePM) && now.isBefore(sevenThirtyAMNextDay);
};



export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [bookings, setBookings] = useState({});
    const [cancellations, setCancellations] = useState({});

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [range, setRange] = useState([{ startDate: new Date(), endDate: new Date(), key: 'selection' }]);
    const [undoing, setUndoing] = useState({});
    const [menu, setMenu] = useState('');
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [newCategory, setNewCategory] = useState();
    const [savingCategory, setSavingCategory] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);


    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (data) => {
            if (!data) router.push('/login');
        });
        return () => unsub();
    }, [router]);


    useEffect(() => {
        setNewCategory(user?.category);
    }, [user])

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUserId(u);

                const bookingsRef = doc(db, 'bookings', u.uid);
                const userRef = doc(db, 'users', u.uid);
                const cancellationsRef = doc(db, 'cancellations', 'global');

                const [snapBookings, snapUser, snapCancellations] = await Promise.all([
                    getDoc(bookingsRef),
                    getDoc(userRef),
                    getDoc(cancellationsRef)
                ]);

                const today = dayjs().format('YYYY-MM-DD');
                const mealDoc = await getDoc(doc(db, 'meals', today));
                if (mealDoc.exists()) setMenu(mealDoc.data().menu);

                if (snapBookings.exists()) setBookings(snapBookings.data());
                if (snapUser.exists()) setUser(snapUser.data());
                if (snapCancellations.exists()) setCancellations(snapCancellations.data());

                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);


    const getMonthCount = () => {
        if (!user?.startDate) return 0;

        const start = new Date(user.startDate);
        const today = new Date();

        start.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        let count = 0;
        let current = new Date(today.getFullYear(), today.getMonth(), 1);

        while (current <= today) {
            const day = current.getDay();

            const ymd = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

            if (current >= start && day !== 0 && day !== 6 && bookings[ymd] !== false) {
                count++;
            }

            current.setDate(current.getDate() + 1);
        }

        return count;
    };



    const sendNotification = async (message) => {
        try {
            await fetch('/api/user-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message || '🚨 Notification from user!' }),
            });
        } catch (error) {

        }
    };

    const handleCancel = async (date) => {
        const ref = doc(db, 'bookings', userId.uid);
        await setDoc(ref, { [date]: false }, { merge: true });
        sendNotification(`${user?.name} Food canceled for ${date}`);
        setBookings((prev) => ({ ...prev, [date]: false }));
    };

    const handleUndoCancel = async (date) => {
        if (!userId) return;
        setUndoing((prev) => ({ ...prev, [date]: true }));
        try {
            const ref = doc(db, 'bookings', userId.uid);
            await updateDoc(ref, { [date]: deleteField() });
            setBookings((prev) => {
                const newBookings = { ...prev };
                delete newBookings[date];
                return newBookings;
            });
            sendNotification(`${user?.name} Food canceled -Undo for ${date}`);
        } finally {
            setUndoing((prev) => ({ ...prev, [date]: false }));
        }
    };

    const getDateAt7AM = (d) => {
        const date = new Date(d);
        date.setHours(7, 0, 0, 0);
        return date;
    };

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

    const handleConfirmRange = async () => {
        const datesToCancel = getDatesInRange(range[0].startDate, range[0].endDate);
        const ref = doc(db, 'bookings', userId.uid);
        const updates = {};
        const now = new Date();
        datesToCancel.forEach((date) => {
            if (getDateAt7AM(date) > now) updates[date] = false;
            sendNotification(`${user?.name} Food canceled for ${date}`);
        });
        if (!Object.keys(updates).length) {
            alert('No valid future dates selected.');
            return;
        }
        await setDoc(ref, updates, { merge: true });
        setBookings((prev) => ({ ...prev, ...updates }));
        setShowModal(false);
    };


    if (loading) {
        return (
            <div className="bg-white flex flex-col items-center justify-center h-screen">
                <Image height={200} width={200} alt="Loading" src="/loading.gif" />
                <p className="text-gray-600 text-lg font-medium">Tracking your meals...</p>
                <p className="text-sm text-gray-400 mt-1">Just a moment while we fetch delicious data.</p>
            </div>
        );
    }
    const amountToPay = getMonthCount() * 50;

    const upiLink = `upi://pay?pa=amalpradeep12-2@okicici&pn=Amal%20Pradeep&am=${amountToPay}&aid=uGICAgICgjf-IHQ`;

    return (
        <div className="min-h-screen bg-white text-gray-800">
            <Header isAuth />
            {user?.locked ? (
                <div className="max-w-md mx-auto py-10 px-4">
                    <div className="flex flex-col">
                        <span>Welcome, {user?.name}</span>
                        <span className="mt-3 text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                            Account locked. Contact admin to approve.
                        </span>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mx-auto py-10 px-4">
                        <div className='xl:flex w-full gap-5 justify-center'>
                            <div className='max-w-sm mx-auto w-full'>
                                <MenuSection menu={menu} />
                                <div className="space-y-4 border border-gray-200 rounded-xl p-6 shadow-sm w-full">
                                    <h2 className="text-xl font-medium">Welcome, {user?.name || 'User'}</h2>
                                    <p className="flex items-center gap-2">
                                        <span className="font-semibold text-teal-600">My Category:</span> {capitalizeWords(user?.category)}
                                        <button
                                            onClick={() => setCategoryModalOpen(true)}
                                            disabled={!canEditCategory()}
                                            className={`p-1 rounded transition ${canEditCategory() ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                            aria-label="Edit category"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600  -ml-3" fill="none" viewBox="0 0 30 30" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z" />
                                            </svg>
                                        </button>
                                    </p>
                                    <p className='font-bold'><span className="font-semibold text-teal-600">Booked Days:</span> {getMonthCount()}</p>
                                    <p className="font-bold flex items-center gap-2">
                                        <span className="font-semibold text-teal-600">Amount to Pay:</span> ₹{amountToPay}
                                        <span
                                            onClick={() => setQrModalOpen(true)}
                                            className="cursor-pointer hover:opacity-80"
                                            title="Show payment QR code"
                                        >
                                            <Image width={15} height={15} unoptimized src="https://static-00.iconduck.com/assets.00/qrcode-scan-icon-2048x2048-666d2r1w.png" alt="QRCode" />
                                        </span>
                                    </p>


                                    {(() => {
                                        const now = dayjs();
                                        const isBefore730 = now.isBefore(now.hour(7).minute(30));
                                        const todayDateStr = dayjs().format('YYYY-MM-DD');
                                        const tomorrowDateStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
                                        const showCancelButtonFor = isBefore730 ? todayDateStr : tomorrowDateStr;

                                        const isTodayUserCanceled = bookings[todayDateStr] === false;
                                        const isTodayAdminCanceled = cancellations[todayDateStr] === false;

                                        const isFutureUserCanceled = bookings[showCancelButtonFor] === false;
                                        const isFutureAdminCanceled = cancellations[showCancelButtonFor] === false;

                                        // Determine message for today cancellation
                                        let todayCancelMessage = null;
                                        if (isTodayAdminCanceled) {
                                            todayCancelMessage = "⚠️  Food service is unavailable today.";
                                        } else if (isTodayUserCanceled) {
                                            todayCancelMessage = "You have canceled today’s food.";
                                        }

                                        return (
                                            <>
                                                {todayCancelMessage && (
                                                    <p className="text-red-500 text-sm font-medium mb-2">
                                                        {todayCancelMessage}
                                                    </p>
                                                )}
                                                {!isFutureUserCanceled && !isFutureAdminCanceled && (
                                                    <button
                                                        onClick={() => handleCancel(showCancelButtonFor)}
                                                        className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition cursor-pointer"
                                                    >
                                                        Cancel {showCancelButtonFor === todayDateStr ? "Today's" : "Tomorrow's"} Food
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}

                                    <div className="flex justify-between text-sm pt-4 border-t border-gray-100 text-teal-700 font-bold">
                                        <button className='cursor-pointer hover:text-teal-500' onClick={() => setShowModal(true)}>📅 Schedule Cancellation</button>
                                    </div>
                                </div>

                                {/* Upcoming Cancellations */}
                                {/* Upcoming Cancellations */}
                                <div className="mt-5 w-full">
                                    <div className="border border-red-200 rounded-xl p-6 shadow-sm bg-red-50">
                                        <h3 className="text-lg font-semibold text-red-600 mb-3">Upcoming Unavailability's</h3>
                                        <div className="space-y-3">
                                            {Object.entries(bookings)
                                                .filter(([date, booked]) => booked === false && new Date(date + 'T07:00:00') > new Date())
                                                .sort(([a], [b]) => a.localeCompare(b))
                                                .map(([date]) => {
                                                    const isAdminCanceled = cancellations?.[date] === false;

                                                    return (
                                                        <div
                                                            key={date}
                                                            className="flex justify-between items-center bg-white border border-red-300 rounded-md p-3 shadow-sm"
                                                        >
                                                            <span className="text-red-700 font-medium">{date}</span>

                                                            {isAdminCanceled ? (
                                                                <span className="text-sm text-red-500 font-semibold">Cancelled By Admin</span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleUndoCancel(date)}
                                                                    disabled={!!undoing[date]}
                                                                    className={`text-sm px-3 py-1 rounded flex items-center justify-center transition cursor-pointer
                    ${undoing[date]
                                                                            ? 'bg-teal-400 cursor-not-allowed text-white'
                                                                            : 'bg-teal-600 hover:bg-teal-700 text-white'}
                  `}
                                                                >
                                                                    {undoing[date] ? (
                                                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                    ) : (
                                                                        'Undo Cancel'
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                            {/* No cancellations */}
                                            {Object.entries(bookings).filter(([date, booked]) =>
                                                booked === false && new Date(date + 'T07:00:00') > new Date()
                                            ).length === 0 && (
                                                    <p className="text-gray-500">No upcoming cancellations.</p>
                                                )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                            <MonthCalendar bookings={bookings} />
                        </div>
                    </div>
                </>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg">
                        <h3 className="text-lg font-semibold mb-4">Select Date Range to Cancel</h3>
                        <DateRange
                            editableDateInputs
                            onChange={(item) => setRange([item.selection])}
                            moveRangeOnFirstSelection={false}
                            ranges={range}
                            minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
                        />
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 cursor-pointer py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRange}
                                className="px-4 py-2 cursor-pointer rounded bg-teal-600 text-white hover:bg-teal-700 text-sm"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {categoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
                        <h3 className="text-lg font-semibold mb-4">Select Category</h3>
                        <div className="flex flex-col gap-3 mb-4">
                            {['small', 'medium', 'large'].map((cat) => (
                                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="category"
                                        value={cat}
                                        checked={newCategory === cat}
                                        onChange={() => setNewCategory(cat)}
                                        className="cursor-pointer"
                                    />
                                    <span className="capitalize">{cat}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setCategoryModalOpen(false)}
                                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                                disabled={savingCategory}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setSavingCategory(true);
                                    try {
                                        const refUser = doc(db, 'users', userId.uid);
                                        await updateDoc(refUser, { category: newCategory });
                                        setUser((prev) => ({ ...prev, category: newCategory }));
                                        setCategoryModalOpen(false);
                                    } catch (e) {
                                        alert('Error saving category');
                                    } finally {
                                        setSavingCategory(false);
                                    }
                                }}
                                className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 text-sm"
                                disabled={savingCategory}
                            >
                                {savingCategory ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {qrModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm flex flex-col items-center">
                        <h3 className="text-lg font-semibold mb-4">Scan to Pay ₹{amountToPay}</h3>
                        <QRCodeCanvas value={upiLink} size={220} level="Q" />
                        <button
                            onClick={() => setQrModalOpen(false)}
                            className="mt-6 px-6 py-2 rounded bg-teal-600 text-white hover:bg-teal-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
