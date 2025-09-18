# **How These Work Together (Workflow)**

1. **User signs up →** `User` + `Tenant`.
2. **Tenant uploads schema JSON →** saved in `DatabaseSchema`.
3. Schema is **processed → embeddings generated →** stored in `SchemaVector`.
4. **Tenant connects DB credentials →** stored in `Integration`.
5. User opens **chat**:

   - Query stored in `Chat`.
   - Agent resolves schema from `SchemaVector`.
   - Query executed → result logged in `QueryLog`.
   - Response sent back → appended to `Chat`.

6. **LangSmith** traces every step (schema resolution, query generation, execution).

---
