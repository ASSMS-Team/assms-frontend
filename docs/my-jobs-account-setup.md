# Technician login and My Jobs setup

Authentication belongs to Customer & Asset Service. Dispatch owns technician skills, regions and assignments. A staff account ID is not a technician ID.

## Create a technician with login access

1. Sign in as Dispatcher or Manager and open **Add technician**.
2. Enter the reference, name, region and skills.
3. Select **Create login access**, enter a unique username and email, and enter and confirm an initial password (12–128 characters).
4. Create the technician. Its profile is saved first, then Customer Service creates a Technician account linked to that exact technician ID.
5. Share credentials securely with the correct person. They sign in using username or email and open **My jobs**.

If login setup fails, the saved technician is retained. Retry or open technician details to finish setup. Retry does not create another technician; a lost success response is reconciled before retrying.

## Set up an existing technician

Open **Technicians → technician details → Login access**. Choose **Create new login**, or **Link existing login** and supply the existing Technician username or email. Confirm who owns the record before linking. The existing account must be active, have the Technician role, and not belong to another technician. Linking preserves its password, staff ID, technician ID and assignments. Sign out and sign in again after linking.

For example, `staging.technician` can belong to `TEC-032` only after an authorized Dispatcher/Manager confirms that they are the same person and explicitly links the account. Never guess ownership from display names.

## Runtime flow

Login issues a signed `technician_id` claim and returns `staff.technicianId`. Dispatch `GET /api/my-assignments` resolves this ID against its local records. A missing or invalid explicit link never falls back to someone else's username. Older unlinked tokens retain the previous username/reference lookup during rollout. Frontend job actions use the linked technician ID rather than the unrelated staff-account ID.

My Jobs distinguishes missing profile (404), permission (403), expired session (401), and service/network failures. No assignments returns a successful empty list.

## API and deployment

Dispatcher/Manager only:

- `GET /api/auth/technician-accounts/{technicianId}` checks a link.
- `POST /api/auth/technician-accounts/{technicianId}` creates a Technician login.
- `PUT /api/auth/technician-accounts/{technicianId}/link` links an existing login.

Customer Service verifies the technician through the Dispatch HTTP API using the operator's bearer token. Set `DispatchService__BaseUrl` to the Dispatch origin (HTTPS in staging). If Customer API requests use APIM, forward these authentication routes too. Retain consistent shared JWT issuer, audience and signing key.

Deploy Customer Service first. Its auth migration command applies `V05__link_technician_accounts.sql`, adding a nullable unique technician ID and preserving existing accounts. Migration failure stops container replacement. Deploy Dispatch, then frontend. Previously issued tokens require sign-out/sign-in to gain the new claim.

Passwords are hashed in Customer Service and never stored in Dispatch, Kafka, local storage or source control. Password fields clear after successful setup. Password expiry, invitations, forced password changes and password resets are outside this implementation.
