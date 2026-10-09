import { apiSlice } from "../apiSlice";

// Landing page data (no sign-in needed)
export const publicApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicProperties: builder.query({
      query: () => ({ url: "/public/properties" }),
    }),
    getPublicStats: builder.query({
      query: () => ({ url: "/public/stats" }),
    }),
  }),
});

export const { useGetPublicPropertiesQuery, useGetPublicStatsQuery } = publicApi;
