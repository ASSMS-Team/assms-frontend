# My Jobs account setup

My Jobs calls Dispatch `GET /api/my-assignments` with the signed-in staff JWT.
Dispatch requires the Technician role and resolves the token's `unique_name`
against its local `technician_reference`, ignoring case. Staff authentication and
Dispatch capability records are separate; a login alone does not create a
technician record.

For example, the `staging.technician` staff username requires a Dispatch record
with reference `staging.technician`. `TEC-032` is not an automatic match even when
the display name or email describes the same person.

A Manager/Dispatcher must provision the correct capability record using the
real region and skills. For an existing technician with assignments, confirm
ownership and use a controlled reference migration that preserves the existing
technician ID; creating another technician would not transfer assignments.
The current update API does not edit references. Do not guess an identity link,
match by display name, or remove assignment authorization to bypass this check.

The page distinguishes a missing profile (404), missing permission (403), an
expired session (401), and a service/network failure. A linked technician with
no assignments still receives a successful empty list. The retry button reloads
the request after provisioning or recovery.
