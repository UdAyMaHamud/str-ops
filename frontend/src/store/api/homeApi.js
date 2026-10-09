import { apiSlice } from "../apiSlice";

// One home screen per role
export const homeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOwnerHome: builder.query({
      query: (property) => ({ url: "/home/owner", params: { property } }),
      providesTags: ["Home"],
    }),
    getTraineeHome: builder.query({
      query: () => ({ url: "/home/trainee" }),
      providesTags: ["Home"],
    }),
    getSeniorHome: builder.query({
      query: () => ({ url: "/home/senior" }),
      providesTags: ["Home"],
    }),
    getAdminHome: builder.query({
      query: () => ({ url: "/home/admin" }),
      providesTags: ["Home"],
    }),
  }),
});

export const { useGetOwnerHomeQuery, useGetTraineeHomeQuery, useGetSeniorHomeQuery, useGetAdminHomeQuery } = homeApi;
