import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const login = async (email, password) => {
  const res = await signInWithEmailAndPassword(auth, email, password);
  const user = res.user;
  // Fetch role from Firestore
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const role = userSnap.exists() ? userSnap.data().role : 'guest';
    return { user, role };
  } catch (error) {
    return { user, role: 'guest' };
  }
};

export const registerUser = async (email, password, fullName, role = 'student') => {
  try {
    // Create user account in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      fullName,
      email,
      role,
      createdAt: serverTimestamp(),
      uid: user.uid
    });

    return {
      success: true,
      user,
      message: 'User registered successfully'
    };
  } catch (error) {
    let errorMessage = 'Registration failed';

    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password must be at least 6 characters long';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }

    return {
      success: false,
      error: error.code,
      message: errorMessage
    };
  }
};

export const logout = async () => {
  return signOut(auth);
};
