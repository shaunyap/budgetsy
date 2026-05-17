import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL;
      if (u && allowedEmail && u.email !== allowedEmail) {
        console.warn("Unauthorized email attempted to login:", u.email);
        alert(`Unauthorized email. Please login with ${allowedEmail}`);
        signOut(auth);
        setUser(null);
      } else {
        setUser(u);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Login Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return { user, loading, loginWithGoogle, logout };
};
