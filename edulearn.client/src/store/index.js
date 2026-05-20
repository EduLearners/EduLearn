// store/index.js
// Redux Toolkit store. Import { store, useAppDispatch, useAppSelector }
// wherever you need Redux state.

import { configureStore } from '@reduxjs/toolkit';
import authReducer    from './authSlice';
import personaReducer from './personaSlice';

export const store = configureStore({
  reducer: {
    auth:    authReducer,
    persona: personaReducer,
  },
});

export default store;
