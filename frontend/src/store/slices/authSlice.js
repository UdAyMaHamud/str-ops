import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, token: null, isAuthenticated: false },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
// Read-only by default: only seniors and admins can change records
export const selectIsSenior = (state) => ['senior', 'admin'].includes(state.auth.user?.role);
// Clients are property owners; staff run the operation
export const selectIsClient = (state) => state.auth.user?.role === 'client';
export const STAFF_ROLES = ['trainee', 'senior', 'admin'];
// Everyone who uses the dashboard (guests use the public site instead)
export const ALL_ROLES = ['client', 'trainee', 'senior', 'admin'];
export const selectIsGuest = (state) => state.auth.user?.role === 'guest';
// Where each role lands after signing in
export const homePathFor = (role) => (role === 'guest' ? '/trips' : '/dashboard');
// After sign-in: go back where they were if that page suits the role, else their own home
export const landingPathFor = (role, redirectTo) => {
  if (!redirectTo) return homePathFor(role);
  const isGuestPage = redirectTo.startsWith('/trips') || redirectTo.startsWith('/saved');
  if (role === 'guest' && redirectTo.startsWith('/dashboard')) return homePathFor(role);
  if (role !== 'guest' && isGuestPage) return homePathFor(role);
  return redirectTo;
};
export default authSlice.reducer;
