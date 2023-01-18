# sanity-content-migrations

## What is it?
Datset content migration runner. Inspired by `rake db:migrate` and similar tools.

### Create migration files
```
$ sanity exec migrate.js -- create load initial data
```

Creates a new timestamped file in `migrations/`

```
$ ls migrations
1674008088293-load-initial-data.js
```

```
$ cat migrations/1674008088293-load-initial-data.js
// Path: migrations/1674008088293-load-initial-data.js
// client is a fully configured sanity client
export const up = async (client) => {
    console.log('up migration')
}
export const down = async (client) => {
    console.log('down migration')
}
```

Do your content migrations in `up` (add documents, patch fields, etc). If possible, do the inverse in `down` (delete documents, re-patch fields, etc) so your migration can be rolled back. Obviously, if you delete a field in the up migration it will be hard to re-instate it in the down migration unless you backup the value somewhere. You could save the revision ID and get the previous values that way, or any other way of preserving information. Note that you'll want to do this either in the dataset itself, or somewhere else non-local, as these migrations should ideally be runnable from anywhere.

### Run pending migrations
```
$ sanity exec migrate.js --withUserToken -- up
```

This will run all migrations not yet ran in the current dataset.

### Rollback previous migration

Not yet implemented

### Rollback all migrations
```
$ sanity exec migrate.js --withUserToken -- down
```

This will undo all migrations ran in the current dataset.

