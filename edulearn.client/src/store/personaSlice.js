// personaSlice.js
// Manages the active persona. The spec defines 4 personas:
//   Learner | Educator | Operations | Governance
// Multiple backend roles can map to one persona. A user with
// multiple roles can switch personas via the sidebar switcher.

import { createSlice } from '@reduxjs/toolkit';

// Maps each backend role to its persona
export const ROLE_TO_PERSONA = {
  Student:    'Learner',
  Instructor: 'Educator',
  Registrar:  'Operations',
  DeptAdmin:  'Operations',
  Finance:    'Operations',
  Auditor:    'Governance',
  ITAdmin:    'Governance',
};

// Each persona's available navigation context
export const PERSONA_LABELS = {
  Learner:    { label: 'Learner',     icon: 'bi-mortarboard' },
  Educator:   { label: 'Educator',    icon: 'bi-person-workspace' },
  Operations: { label: 'Operations',  icon: 'bi-gear' },
  Governance: { label: 'Governance',  icon: 'bi-shield-check' },
};

const personaSlice = createSlice({
  name: 'persona',
  initialState: {
    active: null,        // current active persona string
    available: [],       // list of personas this user can switch to
  },
  reducers: {
    initPersona(state, action) {
      // Called after login. action.payload = role string from JWT.
      const role = action.payload;
      const mapped = ROLE_TO_PERSONA[role] || 'Learner';
      state.active    = mapped;
      state.available = [mapped]; // single-role user has only one persona
    },
    switchPersona(state, action) {
      // Called when user taps the persona switcher.
      if (state.available.includes(action.payload)) {
        state.active = action.payload;
      }
    },
    clearPersona(state) {
      state.active    = null;
      state.available = [];
    },
  },
});

export const { initPersona, switchPersona, clearPersona } = personaSlice.actions;

export const selectActivePersona    = (state) => state.persona.active;
export const selectAvailablePersonas = (state) => state.persona.available;

export default personaSlice.reducer;
