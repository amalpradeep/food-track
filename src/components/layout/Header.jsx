import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import React from 'react'

const Header = ({ isAuth }) => {
    const router = useRouter();

    // logout
    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    return (
        <div className="bg-teal-600 sticky top-0 text-white py-3 px-6 flex justify-between items-center shadow">
            <div>
                <h1 className="text-lg font-semibold font-mono">🍽️ Foodtrack</h1>
            </div>
            {isAuth && (
                <button
                    onClick={handleLogout}
                    className="text-sm hover:text-teal-200 cursor-pointer transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
                    </svg>

                </button>
            )}
        </div>
    )
}

export default Header