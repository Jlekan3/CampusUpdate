import React, { createContext, useEffect, useMemo, useState } from 'react';
import {
  addEvent,
  addNotification,
  deleteEvent,
  deleteNotification,
  subscribeToEvents,
  subscribeToNotifications,
  updateEvent,
  updateNotification,
} from '../services/databaseService';
import { useAuth } from './AuthContext';

export const CampusUpdatesContext = createContext();

export const CampusUpdatesProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setEvents([]);
      setEventsLoading(false);
      return () => {};
    }

    setEventsLoading(true);
    const unsubNotifications = subscribeToNotifications((items) => setNotifications(items));
    const unsubEvents = subscribeToEvents((items) => {
      setEvents(items);
      setEventsLoading(false);
    });

    return () => {
      try {
        unsubNotifications?.();
      } catch (e) {
        // ignore
      }

      try {
        unsubEvents?.();
      } catch (e) {
        // ignore
      }
    };
  }, [user]);

  const value = useMemo(
    () => ({
      notifications,
      events,
      eventsLoading,
      postNotification: async (notification) => {
        const id = await addNotification(notification);
        return { id, ...notification };
      },
      postEvent: async (event) => {
        const id = await addEvent(event);
        return { id, ...event };
      },
      deleteNotification: async (id) => {
        await deleteNotification(id);
      },
      deleteEvent: async (id) => {
        await deleteEvent(id);
      },
      updateNotification: async (id, updates) => {
        await updateNotification(id, updates);
      },
      updateEvent: async (id, updates) => {
        await updateEvent(id, updates);
      },
      clearNotifications: () => {
        // This context is Firestore-backed; clearing is intentionally a no-op.
        // If you want a "mark as read" feature, model it per-user in Firestore.
      },
    }),
    [events, eventsLoading, notifications]
  );

  return (
    <CampusUpdatesContext.Provider value={value}>
      {children}
    </CampusUpdatesContext.Provider>
  );
};
