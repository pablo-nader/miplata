# Runbook: delete a user's data on request

Manual procedure from [BD-0033](../business/BD-0033-manual-data-deletion-on-request.md). The owner runs it by hand in the Neon SQL Editor for the production branch. Nothing here runs automatically.

Deadline: 30 days from the request. Confirm to the requester by email when done.

## 1. Verify the requester

Ask the requester to write from the email address they sign in with. Then find the user:

```sql
select id, email, created_at
from "user"
where email = 'REQUESTER_EMAIL';
```

Continue only if exactly one row comes back and its email is the one the request came from. If not, stop and reply asking for clarification.

## 2. Check the rows that will go

Replace `USER_ID` with the `id` from step 1, then run:

```sql
select 'recurring_occurrence' as table_name, count(*) from recurring_occurrence where user_id = 'USER_ID'
union all select 'posting', count(*) from posting where user_id = 'USER_ID'
union all select 'installment', count(*) from installment where user_id = 'USER_ID'
union all select 'movement', count(*) from movement where user_id = 'USER_ID'
union all select 'statement', count(*) from statement where user_id = 'USER_ID'
union all select 'recurring', count(*) from recurring where user_id = 'USER_ID'
union all select 'account_currency', count(*) from account_currency where user_id = 'USER_ID'
union all select 'account', count(*) from account where user_id = 'USER_ID'
union all select 'budget', count(*) from budget where user_id = 'USER_ID'
union all select 'category', count(*) from category where user_id = 'USER_ID'
union all select 'category_group', count(*) from category_group where user_id = 'USER_ID'
union all select 'session', count(*) from session where user_id = 'USER_ID'
union all select 'auth_account', count(*) from auth_account where user_id = 'USER_ID';
```

Keep the counts in the deletion record. Institutions are shared catalog data, not user data, and are never deleted.

## 3. Delete in one transaction

The order matters. A confirmed recurring occurrence and its movement reference each other with `restrict`, so the link from the movement is cleared first. Rows that reference other rows with `restrict` are then removed first. Postings and installments go away through `cascade` when their movement is deleted.

```sql
begin;

update movement set recurring_occurrence_id = null where user_id = 'USER_ID';
delete from recurring_occurrence where user_id = 'USER_ID';
delete from movement where user_id = 'USER_ID';
delete from statement where user_id = 'USER_ID';
delete from recurring where user_id = 'USER_ID';
delete from account_currency where user_id = 'USER_ID';
delete from account where user_id = 'USER_ID';
delete from budget where user_id = 'USER_ID';
delete from category where user_id = 'USER_ID';
delete from category_group where user_id = 'USER_ID';
delete from session where user_id = 'USER_ID';
delete from auth_account where user_id = 'USER_ID';
delete from "user" where id = 'USER_ID';

commit;
```

If any statement fails, the transaction stops. Run `rollback;` and check the error before trying again. Do not run the statements one by one outside the transaction.

## 4. Verify

Run the count query from step 2 again. Every count must be `0`, and this must return no row:

```sql
select id from "user" where id = 'USER_ID';
```

## 5. Confirm to the requester

Reply to the requester's email. Say that the account and all its records were deleted, and that they can sign up again at any time with the same Google account.

## Adding a table

When a migration adds a table with a `user_id` column, add a `delete` line for it in step 2, step 3 and step 4 in the same pull request, placed before any table it references. Without this, the deletion is incomplete.
