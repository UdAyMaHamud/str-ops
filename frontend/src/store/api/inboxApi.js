import { apiSlice } from "../apiSlice";

export const inboxApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getThreads: builder.query({
      query: (property) => ({ url: "/inbox/threads", params: { property } }),
      providesTags: [{ type: "Thread", id: "LIST" }],
    }),
    getDrafts: builder.query({
      query: (property) => ({ url: "/inbox/drafts", params: { property } }),
      providesTags: [{ type: "Draft", id: "LIST" }],
    }),
    createDraft: builder.mutation({
      query: (body) => ({ url: "/inbox/drafts", method: "POST", body }),
      invalidatesTags: [{ type: "Draft", id: "LIST" }, { type: "Overview", id: "LIST" }, "Home"],
    }),
    reviewDraft: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/inbox/drafts/${id}/review`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Draft", id: "LIST" }, { type: "Thread", id: "LIST" }, { type: "Overview", id: "LIST" }, "Home"],
    }),
  }),
});

export const { useGetThreadsQuery, useGetDraftsQuery, useCreateDraftMutation, useReviewDraftMutation } = inboxApi;
