import { createSlice } from '@reduxjs/toolkit';

// Global property filter shared by every panel
const filterSlice = createSlice({
  name: 'filter',
  initialState: { property: 'all', days: 30 },
  reducers: {
    setProperty: (state, action) => {
      state.property = action.payload;
    },
    setDays: (state, action) => {
      state.days = action.payload;
    },
  },
});

export const { setProperty, setDays } = filterSlice.actions;
export const selectProperty = (state) => state.filter.property;
export const selectDays = (state) => state.filter.days;
export default filterSlice.reducer;
