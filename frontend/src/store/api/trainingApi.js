import { apiSlice } from "../apiSlice";

// Academy: day cards, EOD reports, trainee team
export const trainingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTraining: builder.query({
      query: (user) => ({ url: "/training/progress", params: user ? { user } : undefined }),
    }),
    getEods: builder.query({
      query: (user) => ({ url: "/training/eod", params: user ? { user } : undefined }),
      providesTags: ["Eod"],
    }),
    createEod: builder.mutation({
      query: (body) => ({ url: "/training/eod", method: "POST", body }),
      invalidatesTags: ["Eod", "Home"],
    }),
    reviewEod: builder.mutation({
      query: ({ id, note }) => ({ url: `/training/eod/${id}/review`, method: "PATCH", body: { note } }),
      invalidatesTags: ["Eod", "Home"],
    }),
    getTeam: builder.query({
      query: () => ({ url: "/training/team" }),
      providesTags: ["Eod"],
    }),
  }),
});

export const { useGetTrainingQuery, useGetEodsQuery, useCreateEodMutation, useReviewEodMutation, useGetTeamQuery } = trainingApi;
