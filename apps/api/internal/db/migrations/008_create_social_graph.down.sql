DROP TABLE IF EXISTS mutual_aid_caravans;
DROP TABLE IF EXISTS user_friends;

DROP INDEX IF EXISTS users_invite_code_key;
DROP INDEX IF EXISTS users_handle_key;

ALTER TABLE users DROP COLUMN IF EXISTS invite_code;
ALTER TABLE users DROP COLUMN IF EXISTS handle;
