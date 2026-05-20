// authSlice.js
// Manages authentication state: JWT token, role, username, userId, email.
// Source of truth is sessionStorage (Iron Rule 2). This slice is hydrated
// from sessionStorage on app start and kept in sync on login/logout.

import { createSlice } from '@reduxjs/toolkit';

function readSession() {
  return {
    token:    sessionStorage.getItem('jwt')      || null,
    role:     sessionStorage.getItem('role')     || null,
    username: sessionStorage.getItem('username') || null,
    userId:   sessionStorage.getItem('userId')   || null,
    email:    sessionStorage.getItem('email')    || null,
  };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: readSession(),
  reducers: {
    setSession(state, action) {
      const { token, role, username, userId, email } = action.payload;
      state.token    = token;
      state.role     = role;
      state.username = username;
      state.userId   = userId   ?? null;
      state.email    = email    ?? null;
      // Persist to sessionStorage so page refreshes retain the session
      sessionStorage.setItem('jwt',      token);
      sessionStorage.setItem('role',     role);
      sessionStorage.setItem('username', username);
      if (userId) sessionStorage.setItem('userId', String(userId));
      if (email)  sessionStorage.setItem('email',  email);
    },
    clearSession(state) {
      state.token    = null;
      state.role     = null;
      state.username = null;
      state.userId   = null;
      state.email    = null;
      sessionStorage.clear();
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state) => !!state.auth.token;
export const selectRole            = (state) => state.auth.role;
export const selectUsername        = (state) => state.auth.username;
export const selectUserId          = (state) => state.auth.userId;
export const selectEmail           = (state) => state.auth.email;

export default authSlice.reducer;
