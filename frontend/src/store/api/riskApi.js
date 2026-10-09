import { apiSlice } from "../apiSlice";

// Screening, reviews and damage claims
export const riskApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getScreenings: builder.query({
      query: (property) => ({ url: "/screening/all", params: { property } }),
      providesTags: [{ type: "Screening", id: "LIST" }],
    }),
    updateScreening: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/screening/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Screening", id: "LIST" }, { type: "Overview", id: "LIST" }, "Home"],
    }),
    getReviews: builder.query({
      query: (property) => ({ url: "/review/all", params: { property } }),
    }),
    getClaims: builder.query({
      query: (property) => ({ url: "/review/claims", params: { property } }),
      providesTags: [{ type: "Claim", id: "LIST" }],
    }),
    updateClaim: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/review/claims/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Claim", id: "LIST" }, { type: "Overview", id: "LIST" }, "Home"],
    }),
  }),
});

export const {
  useGetScreeningsQuery,
  useUpdateScreeningMutation,
  useGetReviewsQuery,
  useGetClaimsQuery,
  useUpdateClaimMutation,
} = riskApi;
