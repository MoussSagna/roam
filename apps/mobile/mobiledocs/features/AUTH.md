# Mobile — Authentication

The authentication is **front-end only and simulated**: no backend, no real credentials ([`DECISIONS.md`](../DECISIONS.md) D-28, D-44). The
mocked session and the route protection are described in [`../NAVIGATION.md`](../NAVIGATION.md).

Built one screen per session ([`SCREEN_INTEGRATION_WORKFLOW.md`](../SCREEN_INTEGRATION_WORKFLOW.md)); front-end only, no backend ([`DECISIONS.md`](../DECISIONS.md) D-28, D-29, D-31 to D-36). All 7 screens are done.

| Route                   | Screen          | Notes                                                                                   |
| ----------------------- | --------------- | --------------------------------------------------------------------------------------- |
| `/auth`                 | Entry           | "Se connecter", "Créer un compte", simulated Google/Apple buttons (loading only)        |
| `/auth/login`           | Login           | Email/password form, local validation; any valid input "succeeds" → `/home`             |
| `/auth/register`        | Register        | First name/email/password/confirm + live checklist; same "succeeds" → `/home`           |
| `/auth/forgot-password` | Forgot password | Email step; sends to the reset-code screen (mockup tile 5)                              |
| `/auth/reset-code`      | Reset code      | 6-digit `OtpInput`; only the mock code `123456` "succeeds" → `/auth/new-password`       |
| `/auth/new-password`    | New password    | Password + confirm, same rules/checklist as Register → `/auth/reset-success`            |
| `/auth/reset-success`   | Reset success   | Success badge (`SuccessCheckmark`) + landscape; "Se connecter" replaces → `/auth/login` |

Reached from `WelcomeScreen`'s "Se connecter" link (`t('welcome.signIn')`, `router.replace('/auth')` — replaced, not pushed,
so Welcome cannot be reached back from the auth flow, D-44). Shared
pieces in `features/auth/components/`: `AuthTopBar` (back + small wordmark — its back button only renders
when `router.canGoBack()`, sprint 5, [`DECISIONS.md`](../DECISIONS.md) D-62), `OrDivider`, `SocialButtons`,
`AuthFooterLink`, `PasswordRequirements` (Register's live checklist), `OtpInput` (Reset code's 6-digit
entry), `SuccessCheckmark`/`SuccessLandscape` (Reset success's animated badge and illustration). Generic
form field: `components/ui/TextField`.

## Logout

`SettingsScreen`'s "Se déconnecter" row (it moved from Profile to Settings with D-63) opens a `ConfirmationModal` (`components/ui/`) instead of logging
out directly — "Annuler" closes it with the session untouched, "Se déconnecter" (inside the modal) calls
the existing `useAuth().logout()` then `router.replace('/auth/login')`. `Stack.Protected`'s guard swap
(D-44) removes the whole authenticated group from navigation history the moment `isLoggedIn` flips, so
`/auth/login` ends up with nothing behind it (`router.canGoBack() === false`) — `AuthTopBar` reads exactly
that to decide whether to render its own back button, which is what actually fixes "Login shows a dead
back button after logout" (D-62). `ConfirmationModal` is a generic, reusable primitive (`visible`,
`title`, `description`, `confirmLabel`/`cancelLabel`, `onConfirm`/`onCancel`, `variant: 'default' |
'destructive'`, `loading`, `icon`) — it owns display/animation/interaction only, never logout or any
other domain logic itself.
