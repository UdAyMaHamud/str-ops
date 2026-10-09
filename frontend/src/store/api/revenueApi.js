import { apiSlice } from "../apiSlice";

// Pricing calendar and owner report
export const revenueApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPricing: builder.query({
      query: (property) => ({ url: "/pricing", params: { property } }),
    }),
    getOwnerReport: builder.query({
      query: ({ property, month }) => ({ url: "/report/owner", params: { property, month } }),
    }),
  }),
});

export const { useGetPricingQuery, useGetOwnerReportQuery } = revenueApi;
