/**
 * databaseService.js  —  Supabase backend
 *
 * Public API is identical to the old Firebase version so every screen,
 * navigator and context can keep its existing imports unchanged.
 */
import { supabase } from '../config/supabase';

// ─── normalisation ──────────────────────────────────────────────────────────

const normalizeTimestamps = (row) => {
  if (!row) return row;
  const out = { ...row };
  ['created_at', 'updated_at', 'last_login_at', 'admin_read_at', 'read_at'].forEach((k) => {
    if (out[k] && typeof out[k] === 'string') out[k] = new Date(out[k]);
  });
  // camelCase shims so existing code keeps working
  if (out.created_at) out.createdAt = out.created_at;
  if (out.updated_at) out.updatedAt = out.updated_at;
  return out;
};

const normRows = (rows) => (rows || []).map(normalizeTimestamps);

// ─── realtime subscription helper ───────────────────────────────────────────

/**
 * Subscribe to a Supabase table with an optional row-level filter.
 *
 * @param {string}   table      - public schema table name
 * @param {Function} queryFn   - () => supabase.from(...).select(...)  (no .then)
 * @param {Function} callback  - called with the normalised row array
 * @param {string}   [filter]  - postgres_changes filter string, e.g. 'user_id=eq.xyz'
 * @returns {Function}         - unsubscribe()
 */
const createSubscription = (table, queryFn, callback, filter) => {
  let active = true;

  const doFetch = async () => {
    const { data, error } = await queryFn();
    if (!active) return;
    if (error) {
      console.error(`databaseService(${table}):`, error.message);
      callback([]);
      return;
    }
    callback(normRows(data));
  };

  doFetch();

  const changeOpts = { event: '*', schema: 'public', table };
  if (filter) changeOpts.filter = filter;

  const channel = supabase
    .channel(`${table}-${Date.now()}`)
    .on('postgres_changes', changeOpts, doFetch)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
};

// ─── generic CRUD ────────────────────────────────────────────────────────────

export const addItem = async (table, data) => {
  const { data: row, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row.id;
};

export const updateItem = async (table, id, data) => {
  const { error } = await supabase.from(table).update(data).eq('id', id);
  if (error) throw error;
};

export const deleteItem = async (table, id) => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
};

// For legacy callers that pass (collectionName, id) with string name → table alias
export const subscribeToCollection = (table, callback) =>
  createSubscription(table, () => supabase.from(table).select('*').order('created_at', { ascending: false }), callback);

// ─── Users ───────────────────────────────────────────────────────────────────

export const subscribeToUsers = (callback) =>
  createSubscription('users', () => supabase.from('users').select('*'), callback);

export const getUser = async (id) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) return null;
  return normalizeTimestamps(data);
};

export const upsertUserProfile = async (id, data) => {
  const { error } = await supabase.from('users').upsert({ id, ...data }, { onConflict: 'id' });
  if (error) console.warn('upsertUserProfile:', error.message);
};

/** Admin creates a new Supabase Auth user + profile row. */
export const createUserWithAuthAndFirestore = async (email, password, userData) => {
  // NOTE: supabase.auth.admin.createUser() requires the service-role key and
  // must run server-side (Edge Function). From the client we use signUp which
  // sends a confirmation email.  Set "Confirm Email" to OFF in Supabase Auth
  // settings if you want instant access.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: userData.role || 'student', full_name: userData.fullName || '' } },
  });
  if (error) throw error;

  const userId = data.user?.id;
  if (userId) {
    await supabase.from('users').upsert({
      id:        userId,
      email,
      full_name: userData.fullName || '',
      role:      userData.role    || 'student',
      department:userData.department || '',
    }, { onConflict: 'id' });
  }
  return data.user;
};

// ─── Buildings ───────────────────────────────────────────────────────────────

export const subscribeToBuildings = (cb) =>
  createSubscription('buildings', () => supabase.from('buildings').select('*').order('created_at', { ascending: false }), cb);

export const addBuilding    = (data) => addItem('buildings', data);
export const updateBuilding = (id, data) => updateItem('buildings', id, data);
export const deleteBuilding = (id) => deleteItem('buildings', id);

// ─── Locations ───────────────────────────────────────────────────────────────

export const subscribeToLocations = (cb) =>
  createSubscription('locations', () => supabase.from('locations').select('*').order('created_at', { ascending: false }), cb);

export const addLocation = (data) => addItem('locations', data);

export const addLocationsBatch = async (locations) => {
  const { error } = await supabase.from('locations').insert(locations);
  if (error) throw error;
};

export const updateLocation = (id, data) => updateItem('locations', id, data);
export const deleteLocation = (id) => deleteItem('locations', id);

export const getLocation = async (id) => {
  const { data, error } = await supabase.from('locations').select('*').eq('id', id).single();
  if (error) return null;
  return normalizeTimestamps(data);
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const subscribeToNotifications = (cb) =>
  createSubscription(
    'notifications',
    () => supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    cb,
  );

export const addNotification    = (data) => addItem('notifications', data);
export const updateNotification = (id, data) => updateItem('notifications', id, data);
export const deleteNotification = (id) => deleteItem('notifications', id);

/** Returns an unsubscribe fn; callback receives { notifId: { readAt } } map */
export const subscribeToUserNotificationReads = (userId, callback) => {
  if (!userId) { callback({}); return () => {}; }

  return createSubscription(
    'notification_reads',
    () => supabase.from('notification_reads').select('notification_id, read_at').eq('user_id', userId),
    (rows) => {
      const map = rows.reduce((acc, r) => {
        acc[r.notification_id] = { readAt: r.read_at ? new Date(r.read_at) : null };
        return acc;
      }, {});
      callback(map);
    },
    `user_id=eq.${userId}`,
  );
};

export const markNotificationAsRead = async (userId, notificationId) => {
  await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
};

// ─── Events ──────────────────────────────────────────────────────────────────

export const subscribeToEvents = (cb) =>
  createSubscription(
    'events',
    () => supabase.from('events').select('*').order('created_at', { ascending: false }),
    cb,
  );

export const addEvent    = (data) => addItem('events', data);
export const updateEvent = (id, data) => updateItem('events', id, data);
export const deleteEvent = (id) => deleteItem('events', id);

/** Returns { eventId: { createdAt } } map for the user */
export const subscribeToUserEventInterests = (userId, callback) => {
  if (!userId) { callback({}); return () => {}; }

  return createSubscription(
    'event_interests',
    () => supabase.from('event_interests').select('event_id, created_at').eq('user_id', userId),
    (rows) => {
      const map = rows.reduce((acc, r) => {
        acc[r.event_id] = { createdAt: r.created_at ? new Date(r.created_at) : null };
        return acc;
      }, {});
      callback(map);
    },
    `user_id=eq.${userId}`,
  );
};

export const saveUserEventInterest = async (userId, eventId) => {
  const { error } = await supabase.from('event_interests').upsert({ user_id: userId, event_id: eventId }, { onConflict: 'user_id,event_id' });
  if (error) throw error;
};

export const removeUserEventInterest = async (userId, eventId) => {
  const { error } = await supabase.from('event_interests').delete().eq('user_id', userId).eq('event_id', eventId);
  if (error) throw error;
};

// ─── Dining ──────────────────────────────────────────────────────────────────

export const subscribeToDining = (cb) =>
  createSubscription('dining', () => supabase.from('dining').select('*').order('created_at', { ascending: false }), cb);

export const getDining = async () => {
  const { data } = await supabase.from('dining').select('*').order('created_at', { ascending: false });
  return normRows(data);
};

export const addDining    = (data) => addItem('dining', data);
export const updateDining = (id, data) => updateItem('dining', id, data);
export const deleteDining = (id) => deleteItem('dining', id);

// ─── Campus Rules ─────────────────────────────────────────────────────────────

export const subscribeToCampusRules = (cb) =>
  createSubscription('campus_rules', () => supabase.from('campus_rules').select('*').order('created_at', { ascending: false }), cb);

export const addCampusRule    = (data) => addItem('campus_rules', data);
export const updateCampusRule = (id, data) => updateItem('campus_rules', id, data);
export const deleteCampusRule = (id) => deleteItem('campus_rules', id);

// ─── Favourites ──────────────────────────────────────────────────────────────

export const subscribeToUserFavorites = (userId, callback) => {
  if (!userId) { callback([]); return () => {}; }

  return createSubscription(
    'favourites',
    () => supabase.from('favourites').select('*, location:location_id(*)').eq('user_id', userId).order('created_at', { ascending: false }),
    (rows) => {
      // Mirror the old shape: { id, userId, locationId, createdAt }
      callback(rows.map((r) => ({ id: r.id, userId: r.user_id, locationId: r.location_id, createdAt: r.created_at })));
    },
    `user_id=eq.${userId}`,
  );
};

/** Returns true if added, false if removed */
export const toggleFavorite = async (userId, locationId) => {
  const { data, error } = await supabase.rpc('toggle_favourite', { p_location_id: locationId });
  if (error) throw error;
  return data;
};

export const removeFavorite = async (favouriteId) => deleteItem('favourites', favouriteId);

// ─── Issue Reports ────────────────────────────────────────────────────────────

export const subscribeToIssueReports = (cb) =>
  createSubscription(
    'reports',
    () => supabase.from('reports').select('*').order('created_at', { ascending: false }),
    (rows) => {
      // Shim snake_case → camelCase for existing consumer code
      cb(rows.map((r) => ({
        ...r,
        reporterId:    r.reporter_id,
        reporterName:  r.reporter_name,
        reporterEmail: r.reporter_email,
        reporterRole:  r.reporter_role,
        photoUris:     r.photo_uris || r.photo_urls || [],
        photoCount:    r.photo_count,
        adminResponse: r.admin_response,
        adminReadAt:   r.admin_read_at ? new Date(r.admin_read_at) : null,
        adminReadBy:   r.admin_read_by,
      })));
    },
  );

export const addIssueReport = async (data) => {
  const payload = {
    title:          data.title,
    description:    data.description,
    category:       data.category,
    status:         data.status || 'open',
    priority:       data.priority || 'medium',
    reporter_id:    data.reporterId,
    reporter_name:  data.reporterName,
    reporter_email: data.reporterEmail,
    reporter_role:  data.reporterRole,
    photo_uris:     data.photoUris || [],
    photo_urls:     data.photoUris || [],
    photo_count:    data.photoCount || 0,
  };
  return addItem('reports', payload);
};

export const updateIssueReport = async (id, data) => {
  const payload = { ...data };
  // camelCase → snake_case shims
  if (data.adminResponse  !== undefined) payload.admin_response = data.adminResponse;
  if (data.adminReadAt    !== undefined) payload.admin_read_at  = data.adminReadAt;
  if (data.adminReadBy    !== undefined) payload.admin_read_by  = data.adminReadBy;
  return updateItem('reports', id, payload);
};

export const deleteIssueReport = (id) => deleteItem('reports', id);

// ─── Amenities ───────────────────────────────────────────────────────────────

export const subscribeToAmenities = (cb) =>
  createSubscription('amenities', () => supabase.from('amenities').select('*').order('created_at', { ascending: false }), cb);

export const subscribeToAmenitiesCount = (cb) =>
  createSubscription(
    'amenities',
    () => supabase.from('amenities').select('id'),
    (rows) => cb(rows.length),
  );

export const getAmenities = async () => {
  const { data } = await supabase.from('amenities').select('*').order('created_at', { ascending: false });
  return normRows(data);
};

export const getAmenitiesCount = async () => {
  const { count } = await supabase.from('amenities').select('id', { count: 'exact', head: true });
  return count || 0;
};

export const addAmenity    = (data) => addItem('amenities', data);
export const updateAmenity = (id, data) => updateItem('amenities', id, data);
export const deleteAmenity = (id) => deleteItem('amenities', id);

// ─── Departments ─────────────────────────────────────────────────────────────

export const subscribeToDepartments = (cb) =>
  createSubscription(
    'departments',
    () => supabase.from('departments').select('*').order('created_at', { ascending: false }),
    (rows) => {
      // Mirror the old Firestore field names
      cb(rows.map((r) => ({
        ...r,
        availabilityStatus: r.availability_status,
        operatingHours:     r.operating_hours,
        imageUrl:           r.image_url,
      })));
    },
  );

export const addDepartment = async (data) => {
  const payload = {
    name:                data.name,
    description:         data.description,
    category:            data.category,
    availability_status: data.availabilityStatus || data.availability_status || 'Open',
    operating_hours:     data.operatingHours     || data.operating_hours,
    image_url:           data.imageUrl           || data.image_url,
  };
  return addItem('departments', payload);
};

export const updateDepartment = async (id, data) => {
  const payload = { ...data };
  if (data.availabilityStatus !== undefined) payload.availability_status = data.availabilityStatus;
  if (data.operatingHours     !== undefined) payload.operating_hours     = data.operatingHours;
  if (data.imageUrl           !== undefined) payload.image_url           = data.imageUrl;
  return updateItem('departments', id, payload);
};

export const deleteDepartment = (id) => deleteItem('departments', id);
