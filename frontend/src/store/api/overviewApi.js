import { apiSlice } from "../apiSlice";

export const overviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOverview: builder.query({
      query: ({ property, days }) => ({ url: "/overview", params: { property, days } }),
      providesTags: [{ type: "Overview", id: "LIST" }, "Home"],
    }),
    getProperties: builder.query({
      query: () => ({ url: "/property/all" }),
      providesTags: [{ type: "Property", id: "LIST" }],
    }),
    createProperty: builder.mutation({
      query: (body) => ({ url: "/property/create", method: "POST", body }),
      invalidatesTags: [{ type: "Property", id: "LIST" }, { type: "Overview", id: "LIST" }, "Home"],
    }),
    auditProperty: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/property/${id}/audit`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Property", id: "LIST" }, "Home"],
    }),
    assignOwner: builder.mutation({
      query: ({ id, owner }) => ({ url: `/property/${id}/owner`, method: "PATCH", body: { owner } }),
      invalidatesTags: [{ type: "Property", id: "LIST" }, "Home", "User"],
    }),
  }),
});

export const { useGetOverviewQuery, useGetPropertiesQuery, useCreatePropertyMutation, useAuditPropertyMutation, useAssignOwnerMutation } = overviewApi;
