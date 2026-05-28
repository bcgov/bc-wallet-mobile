# Conventions

Design and UI/UX decisions for bc-wallet-mobile. Add an entry here when a pattern is established or an approach is explicitly chosen over an alternative.

---

## UI Feedback: Use Banner Messages, Not Toast Notifications

Use banner messages (inline, persistent contextual alerts) instead of toast notifications for user feedback.

**Why:** Banners are more accessible, remain visible until dismissed, and fit better within screen flows than transient toasts which can be missed or obscure content.
