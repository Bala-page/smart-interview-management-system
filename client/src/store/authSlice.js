import { createSlice } from '@reduxjs/toolkit';

const getInitialUser = () => {
  try {
    const stored = localStorage.getItem('sims_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const initialState = {
  user: getInitialUser(),
  token: localStorage.getItem('sims_token') || null,
  isAuthenticated: !!localStorage.getItem('sims_token'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem('sims_token', token);
      localStorage.setItem('sims_user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('sims_token');
      localStorage.removeItem('sims_user');
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('sims_user', JSON.stringify(state.user));
    },
  },
});

export const { loginSuccess, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
