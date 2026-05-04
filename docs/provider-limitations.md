# Provider Limitations

Local run history is the source of truth. Online profile and benchmark provider integrations should be treated as optional enrichment because public stability varies by provider.

Provider adapters should follow these rules:

- Never block app startup.
- Use short timeouts and visible `lastSyncedAt` state.
- Cache successful responses.
- Return degraded states instead of throwing through dashboard or progression views.
- Keep fixture responses for regression tests when an adapter is added.

The initial `resolve_online_profile` command returns `not_configured`; it preserves the command boundary without coupling the app to undocumented endpoints.
