import { apiSlice } from "../apiSlice";

// Admin: people and roles
export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: (params) => ({ url: "/user/all", params }),
      providesTags: ["User"],
    }),
    updateRole: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/user/${id}/role`, method: "PATCH", body }),
      invalidatesTags: ["User", "Home"],
    }),
  }),
});

export const { useGetUsersQuery, useUpdateRoleMutation } = userApi;
