

## Fix Friend Search

### Problem
1. The search query itself uses `ilike` with wildcards which should do partial matching, but it only searches the `username` field. Adding email search would help.
2. More critically: the search filters out existing friends and incoming friend requests, but does NOT filter out **outgoing** pending requests (people you already sent a request to). This could cause confusion but isn't the "nothing shows up" bug.
3. The actual bug is likely that the search works but results get filtered out incorrectly, OR there's a timing issue with the `friends`/`friendRequests` data not being loaded.

### Investigation
I verified the database has 3 profiles (Susi, flaviacereza96!, Charlottel7) and 1 accepted friendship. The `ilike` query and RLS policies look correct.

### Plan

**File: `src/pages/PeoplePage.tsx`**
1. Search both `username` and `email` fields using `.or()` with `ilike` patterns for broader matching
2. Also fetch **outgoing** pending requests (where current user is `user_id` and status is `pending`) to filter those out of search results too
3. Add a "no results found" message when search completes with 0 results
4. Show a loading state during search

**File: `src/hooks/useEvents.ts`**
1. Add a `useSentFriendRequests()` hook that fetches outgoing pending requests (where `user_id = currentUser` and `status = 'pending'`) so search can exclude those users

### Technical Details
- Replace `.ilike('username', ...)` with `.or(`username.ilike.%query%,email.ilike.%query%`)` for broader matching
- Fetch sent requests alongside incoming ones to properly filter all already-connected/pending users from search results

