import { apiSlice } from "../apiSlice";

// Integrations, n8n workflows and escalations
export const systemApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getIntegrations: builder.query({
      query: () => ({ url: "/integration/all" }),
    }),
    getWorkflowRuns: builder.query({
      query: () => ({ url: "/integration/workflows" }),
    }),
    getContacts: builder.query({
      query: () => ({ url: "/escalation/contacts" }),
    }),
    getEscalations: builder.query({
      query: (property) => ({ url: "/escalation/all", params: { property } }),
      providesTags: [{ type: "Escalation", id: "LIST" }],
    }),
    createEscalation: builder.mutation({
      query: (body) => ({ url: "/escalation/create", method: "POST", body }),
      invalidatesTags: [{ type: "Escalation", id: "LIST" }, "Home"],
    }),
    resolveEscalation: builder.mutation({
      query: (id) => ({ url: `/escalation/${id}/resolve`, method: "PATCH" }),
      invalidatesTags: [{ type: "Escalation", id: "LIST" }, "Home"],
    }),
  }),
});

export const {
  useGetIntegrationsQuery,
  useGetWorkflowRunsQuery,
  useGetContactsQuery,
  useGetEscalationsQuery,
  useCreateEscalationMutation,
  useResolveEscalationMutation,
} = systemApi;
