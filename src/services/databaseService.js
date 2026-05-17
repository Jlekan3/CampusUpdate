import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  where,
  setDoc,
  writeBatch,
  deleteField,
  GeoPoint,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

const makeCollectionRef = (name) => collection(db, name);

const normalizeTimestamps = (data) => {
  const out = { ...(data || {}) };
  for (const key of ['createdAt', 'updatedAt']) {
    const value = out[key];
    if (value && typeof value.toDate === 'function') {
      out[key] = value.toDate();
    }
  }
  return out;
};

const normalizeReadEntries = (readEntries) => {
  if (!readEntries || typeof readEntries !== 'object') return {};

  return Object.entries(readEntries).reduce((accumulator, [notificationId, entry]) => {
    if (!notificationId) return accumulator;

    const readAt = entry?.readAt && typeof entry.readAt.toDate === 'function'
      ? entry.readAt.toDate()
      : entry?.readAt || null;

    accumulator[notificationId] = { readAt };
    return accumulator;
  }, {});
};

const getSecondaryAuth = () => {
  // Creating users with the primary auth instance will replace the current session.
  // Use a secondary app/auth instance so the admin stays logged in.
  const secondaryAppName = 'secondary-auth';

  const existing = getApps().find((app) => app.name === secondaryAppName);
  const secondaryApp = existing || initializeApp(auth.app.options, secondaryAppName);
  return getAuth(secondaryApp);
};

export const subscribeToCollection = (name, callback) => {
  const q = query(makeCollectionRef(name), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...normalizeTimestamps(d.data()) }));
      callback(items);
    },
    (error) => {
      console.error(`subscribeToCollection(${name}) error:`, error?.code, error?.message || error);
      callback([]);
    }
  );
};

// Special handler for users collection - doesn't require createdAt
export const subscribeToUsers = (callback) => {
  return onSnapshot(makeCollectionRef('users'), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...normalizeTimestamps(d.data()) }));
    console.log('subscribeToUsers - Firestore snapshot received, item count:', items.length);
    callback(items);
  }, (error) => {
    console.error('subscribeToUsers - Error fetching users from Firestore:', error.code, error.message);
    // Check if it's a permission issue
    if (error.code === 'permission-denied') {
      console.error('Permission denied - make sure your Firestore rules allow admin to read users collection');
    }
    callback([]);
  });
};

export const addItem = async (name, data) => {
  const ref = await addDoc(makeCollectionRef(name), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateItem = async (name, id, data) => {
  const ref = doc(db, name, id);
  await updateDoc(ref, data);
};

export const deleteItem = async (name, id) => {
  const ref = doc(db, name, id);
  await deleteDoc(ref);
};

// Convenience wrappers
export const subscribeToBuildings = (cb) => subscribeToCollection('buildings', cb);
export const addBuilding = (data) => addItem('buildings', data);
export const updateBuilding = (id, data) => updateItem('buildings', id, data);
export const deleteBuilding = (id) => deleteItem('buildings', id);

const normalizeReport = (item) => ({
  ...item,
  title: item.title || 'Untitled Report',
  description: item.description || '',
  category: item.category || 'General',
  status: item.status || 'open',
  reporterName: item.reporterName || 'Anonymous',
  reporterEmail: item.reporterEmail || '',
  reporterRole: item.reporterRole || 'student',
  adminResponse: item.adminResponse || '',
  adminReadAt: item.adminReadAt && typeof item.adminReadAt.toDate === 'function'
    ? item.adminReadAt.toDate()
    : item.adminReadAt || null,
  adminReadBy: item.adminReadBy || '',
  photoUris: Array.isArray(item.photoUris) ? item.photoUris : [],
  photoCount: typeof item.photoCount === 'number' ? item.photoCount : Array.isArray(item.photoUris) ? item.photoUris.length : 0,
});

const normalizeDining = (item) => ({
  ...item,
  name: item.name || 'Unnamed Dining Option',
  category: item.category || item.type || 'Dining',
  type: item.type || item.category || 'Dining',
  location: item.location || '',
  hours: item.hours || '',
  contact: item.contact || item.phone || '',
  phone: item.phone || item.contact || '',
  foodtype: item.foodtype || item.cuisine || '',
  cuisine: item.cuisine || item.foodtype || '',
  icon: item.icon || 'restaurant-outline',
  rating: typeof item.rating === 'number' ? item.rating : Number(item.rating) || 0,
});

const normalizeLocation = (item) => {
  const rawCoordinates = item.coordinates || {
    latitude: item.latitude,
    longitude: item.longitude,
  };

  const latitude = typeof rawCoordinates?.latitude === 'number'
    ? rawCoordinates.latitude
    : Number.isFinite(Number(rawCoordinates?.latitude))
      ? Number(rawCoordinates.latitude)
      : Number.isFinite(Number(item.latitude))
        ? Number(item.latitude)
        : undefined;

  const longitude = typeof rawCoordinates?.longitude === 'number'
    ? rawCoordinates.longitude
    : Number.isFinite(Number(rawCoordinates?.longitude))
      ? Number(rawCoordinates.longitude)
      : Number.isFinite(Number(item.longitude))
        ? Number(item.longitude)
        : undefined;

  const coordinates =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? { latitude, longitude }
      : null;

  return {
    ...item,
    name: item.name || item.names || item.title || 'Unnamed Location',
    names: item.names || item.name || item.title || 'Unnamed Location',
    type: item.type || item.category || 'Location',
    category: item.category || item.type || 'Location',
    building: item.building || item.buildingId || '',
    coordinates,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    icon: item.icon || 'location-outline',
  };
};

const normalizeAmenity = (item) => {
  const locationValue = item.location;
  const coordinates = item.coordinates || (
    locationValue && typeof locationValue === 'object'
      ? {
          latitude: typeof locationValue.latitude === 'number' ? locationValue.latitude : undefined,
          longitude: typeof locationValue.longitude === 'number' ? locationValue.longitude : undefined,
        }
      : null
  );

  return {
    ...item,
    name: item.name || 'Unnamed Amenity',
    description: item.description || '',
    icon_name: item.icon_name || item.iconName || 'fitness-outline',
    coordinates,
  };
};

export const subscribeToLocations = (cb) =>
  subscribeToCollection('locations', (items) => cb(items.map(normalizeLocation)));
export const addLocation = (data) => addItem('locations', data);

export const addLocationsBatch = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const refs = [];

  for (let index = 0; index < items.length; index += 450) {
    const chunk = items.slice(index, index + 450);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      const ref = doc(collection(db, 'locations'));
      refs.push(ref.id);
      batch.set(ref, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  return refs;
};

export const updateLocation = (id, data) => updateItem('locations', id, data);
export const deleteLocation = (id) => deleteItem('locations', id);

export const subscribeToNotifications = (cb) => subscribeToCollection('notifications', cb);
export const addNotification = (data) => addItem('notifications', data);
export const updateNotification = (id, data) => updateItem('notifications', id, data);
export const deleteNotification = (id) => deleteItem('notifications', id);

export const subscribeToUserNotificationReads = (userId, cb) => {
  if (!userId) {
    cb({});
    return () => {};
  }

  return onSnapshot(
    doc(db, 'users', userId),
    (snap) => {
      if (!snap.exists()) {
        cb({});
        return;
      }

      const data = snap.data() || {};
      cb(normalizeReadEntries(data.notificationReads));
    },
    () => cb({})
  );
};

export const markNotificationAsRead = async (userId, notificationId) => {
  if (!userId || !notificationId) {
    throw new Error('User ID and notification ID are required');
  }

  await setDoc(
    doc(db, 'users', userId),
    {
      notificationReads: {
        [notificationId]: {
          readAt: serverTimestamp(),
        },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const subscribeToEvents = (cb) => subscribeToCollection('events', cb);
export const addEvent = (data) => addItem('events', data);
export const updateEvent = (id, data) => updateItem('events', id, data);
export const deleteEvent = (id) => deleteItem('events', id);

// Dining (stored in the 'dining' collection)
export const subscribeToDining = (cb) => {
  return onSnapshot(
    makeCollectionRef('dining'),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...normalizeTimestamps(d.data()) }))
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

          if (bTime !== aTime) return bTime - aTime;
          return (a.name || '').localeCompare(b.name || '');
        })
        .map(normalizeDining);

      cb(items);
    },
    (error) => {
      console.error('subscribeToDining - Error fetching dining records:', error.code, error.message);
      cb([]);
    }
  );
};

export const getDining = async () => {
  const snap = await getDocs(makeCollectionRef('dining'));
  const items = snap.docs
    .map((d) => ({ id: d.id, ...normalizeTimestamps(d.data()) }))
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (bTime !== aTime) return bTime - aTime;
      return (a.name || '').localeCompare(b.name || '');
    })
    .map(normalizeDining);

  return items;
};

export const addDining = async (data) => {
  const ref = await addDoc(makeCollectionRef('dining'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateDining = async (id, data) => {
  const ref = doc(db, 'dining', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteDining = (id) => deleteItem('dining', id);

// Campus rules (stored in the 'rules' collection)
export const subscribeToCampusRules = (cb) => {
  return onSnapshot(makeCollectionRef('rules'), (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...normalizeTimestamps(d.data()) }))
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

    cb(items);
  }, (error) => {
    console.error('subscribeToCampusRules - Error fetching rules:', error.code, error.message);
    cb([]);
  });
};

export const addCampusRule = async (data) => {
  const ref = await addDoc(makeCollectionRef('rules'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateCampusRule = async (id, data) => {
  const ref = doc(db, 'rules', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteCampusRule = (id) => deleteItem('rules', id);

// Favourites (stored in the 'favourite' collection)
export const subscribeToUserFavorites = (userId, callback) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(makeCollectionRef('favourite'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...normalizeTimestamps(d.data()) }))
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
      callback(items);
    },
    (error) => {
      console.error('subscribeToUserFavorites error:', error?.code, error?.message || error);
      callback([]);
    }
  );
};

export const toggleFavorite = async (userId, locationId) => {
  if (!userId || !locationId) {
    throw new Error('Sign in to save favorites.');
  }

  const q = query(
    makeCollectionRef('favourite'),
    where('userId', '==', userId),
    where('locationId', '==', locationId)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    return false;
  }

  await addDoc(makeCollectionRef('favourite'), {
    userId,
    locationId,
    createdAt: serverTimestamp(),
  });
  return true;
};

export const removeFavorite = (favouriteId) => deleteItem('favourite', favouriteId);

// Issue reports (stored in the 'reports' collection)
export const addIssueReport = async (data) => {
  const ref = await addDoc(makeCollectionRef('reports'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const subscribeToIssueReports = (cb) => {
  return onSnapshot(
    query(makeCollectionRef('reports'), orderBy('createdAt', 'desc')),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...normalizeTimestamps(d.data()) })).map(normalizeReport);
      cb(items);
    },
    (error) => {
      console.error('subscribeToIssueReports - Error fetching reports:', error.code, error.message);
      cb([]);
    }
  );
};

export const updateIssueReport = async (id, data) => {
  const ref = doc(db, 'reports', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteIssueReport = (id) => deleteItem('reports', id);

// Amenities (stored in the 'amenities' collection)
export const subscribeToAmenities = (cb) => {
  return onSnapshot(
    makeCollectionRef('amenities'),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...normalizeTimestamps(d.data()) }))
        .map(normalizeAmenity)
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

          if (bTime !== aTime) return bTime - aTime;
          return (a.name || '').localeCompare(b.name || '');
        });

      cb(items);
    },
    (error) => {
      console.error('subscribeToAmenities - Error fetching amenities:', error.code, error.message);
      cb([]);
    }
  );
};

export const subscribeToAmenitiesCount = (cb) => {
  return onSnapshot(
    makeCollectionRef('amenities'),
    (snap) => {
      cb(snap.size || 0);
    },
    (error) => {
      console.error('subscribeToAmenitiesCount - Error fetching amenities count:', error.code, error.message);
      cb(0);
    }
  );
};

export const getAmenities = async () => {
  const snap = await getDocs(makeCollectionRef('amenities'));
  return snap.docs
    .map((d) => ({ id: d.id, ...normalizeTimestamps(d.data()) }))
    .map(normalizeAmenity)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (bTime !== aTime) return bTime - aTime;
      return (a.name || '').localeCompare(b.name || '');
    });
};

export const getAmenitiesCount = async () => {
  const snap = await getDocs(makeCollectionRef('amenities'));
  return snap.size || 0;
};

export const addAmenity = async (data) => {
  const ref = doc(makeCollectionRef('amenities'));
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateAmenity = async (id, data) => {
  const ref = doc(db, 'amenities', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteAmenity = (id) => deleteItem('amenities', id);

const normalizeEventInterests = (eventInterests) => {
  if (!eventInterests || typeof eventInterests !== 'object') return [];

  return Object.entries(eventInterests).map(([eventId, interest]) => {
    const item = interest || {};
    const savedAt = item.savedAt && typeof item.savedAt.toDate === 'function'
      ? item.savedAt.toDate()
      : item.savedAt || null;

    return {
      eventId,
      reminderTime: item.reminderTime ?? 0,
      reminderLabel: item.reminderLabel || 'At Event Time',
      savedAt,
    };
  });
};

export const subscribeToUserEventInterests = (userId, callback) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }

      const data = snap.data() || {};
      callback(normalizeEventInterests(data.eventInterests));
    },
    () => callback([])
  );
};

export const saveUserEventInterest = async (userId, eventId, reminder) => {
  if (!userId || !eventId) {
    throw new Error('User ID and event ID are required');
  }

  await setDoc(
    doc(db, 'users', userId),
    {
      eventInterests: {
        [eventId]: {
          reminderTime: reminder?.minutes ?? 0,
          reminderLabel: reminder?.label || 'At Event Time',
          savedAt: serverTimestamp(),
        },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const removeUserEventInterest = async (userId, eventId) => {
  if (!userId || !eventId) {
    throw new Error('User ID and event ID are required');
  }

  await updateDoc(doc(db, 'users', userId), {
    [`eventInterests.${eventId}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
};

// Create user with Firebase Auth + Firestore
// This function creates a user in Firebase Auth with email/password
// Then creates a user document in Firestore with the UID as the document ID
// Password is NOT stored in Firestore (managed by Firebase Auth)
export const createUserWithAuthAndFirestore = async (email, password, userData) => {
  try {
    console.log('createUserWithAuthAndFirestore: Starting...');
    console.log('createUserWithAuthAndFirestore: Email:', email);
    console.log('createUserWithAuthAndFirestore: Password length:', password?.length);
    console.log('createUserWithAuthAndFirestore: User data:', JSON.stringify(userData, null, 2));
    
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    console.log('✓ createUserWithAuthAndFirestore: Validation passed');
    
    // Step 1: Create user in Firebase Authentication
    console.log('→ createUserWithAuthAndFirestore: Creating Firebase Auth user...');
    const secondaryAuth = getSecondaryAuth();
    const authResult = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = authResult.user.uid;
    console.log('✓ createUserWithAuthAndFirestore: Auth user created with UID:', uid);

    try {
      await signOut(secondaryAuth);
    } catch (e) {
      console.log('createUserWithAuthAndFirestore: secondary auth signOut skipped', e);
    }

    // Step 2: Create user document in Firestore with UID as document ID
    console.log('→ createUserWithAuthAndFirestore: Creating Firestore document...');
    const firestoreData = {
      ...userData,
      email: email,
      createdAt: serverTimestamp(),
    };
    
    console.log('createUserWithAuthAndFirestore: Firestore data:', JSON.stringify(firestoreData, null, 2));

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, firestoreData);
    console.log('✓ createUserWithAuthAndFirestore: Firestore document created successfully');

    return uid;
  } catch (error) {
    console.error('✗ createUserWithAuthAndFirestore: Error caught');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    // Better error messages
    let userMessage = error.message;
    if (error.code === 'permission-denied') {
      userMessage = 'Permission denied: Make sure Firestore rules allow admin to create users. Check your firebase.rules file.';
    }
    
    throw new Error(userMessage);
  }
}
