import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import React from 'react'

const Header = ({isAuth}) => {
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
                className="text-sm border border-white px-3 py-1 rounded hover:bg-white hover:text-teal-600 transition"
            >
                Logout
            </button>
            )}
        </div>
    )
}

export default Header