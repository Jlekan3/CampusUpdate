import { supabase } from '../config/supabase';

export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = data.user;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return { user, role: profile?.role || 'student' };
};

export const registerUser = async (email, password, fullName, role = 'student') => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });

  if (error) {
    let message = 'Registration failed';
    if (error.message.includes('already registered')) message = 'This email is already registered';
    if (error.message.includes('password'))           message = 'Password must be at least 6 characters';
    return { success: false, error: error.message, message };
  }

  return { success: true, user: data.user, message: 'User registered successfully' };
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
