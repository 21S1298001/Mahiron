# Mirakurun ChangeLog

see [Commit Logs](https://github.com/Chinachu/Mirakurun/commits/master) to check all.

## 2.8.0 (2019-01-03)

- use `--unsafe-perm` instead of `--unsafe`.

### Server Changes

- **node**: change `--max_old_space_size=256` to `--max_old_space_size=512`.
- **log**: env `LOG_STDOUT`, `LOG_STDERR` are not used anymore.
- **install**: add way to install **not** using `--unsafe-perm`.
- **cli**: add `init` command to init as service manually.

## 2.7.7 (2019-01-03)

### Server Changes

- **log**: fix comply http logs to log level setting.  [#41](https://github.com/Chinachu/Mirakurun/issues/41)

## 2.7.6 (2019-01-02)

### Server Changes

- **install**: fix missing `colors` dependency.

### Dependencies

- colors: `^1.3.3`

## 2.7.5 (2018-12-25)

### Server Changes

- **security**: allow referrer from `localhost`.
- **epg**: fix garbled parsing in extended description. [#26](https://github.com/Chinachu/Mirakurun/issues/26) [#40](https://github.com/Chinachu/Mirakurun/pull/40)

### Dependencies

- body-parser: `^1.17.1` → `^1.18.3`
- express-openapi: `^3.0.3` → `^3.6.0`
- js-yaml: `^3.8.4` → `^3.12.0`
- morgan: `^1.7.0` → `^1.9.1`
- semver: `^5.3.0` → `^5.6.0`
- tail: `^1.2.1` → `^1.4.1`

## 2.7.4 (2018-11-02)

### Server Changes

- **epg**: fix crash on epg gathering.

### Dependencies

- aribts: `1.3.3` → `^1.3.4`

## 2.7.2 (2018-10-19)

- **package**: add support node@10
- **build**: use `rimraf` instead of `gulp-del`
- **test**: add (dummy)

### Server Changes

- **ts-filter**: add padding to PAT with `0xff`. [#33](https://github.com/Chinachu/Mirakurun/issues/33) [#34](https://github.com/Chinachu/Mirakurun/pull/34)
- **tuner**: fix takeover strategy to lower priority first. [#31](https://github.com/Chinachu/Mirakurun/commit/3549d4d1994c07d415fb160faa7fc2e6bd4dbae0)
- **debug**: allow non-root users.
- **debug**: use `dotenv`.

### Dependencies

- express: `^4.15.2` → `^4.16.4`
- express-openapi: `^1.4.0` → `^3.0.3`
- sift: `^5.0.0` → `5.1.0`

## 2.7.0 (2018-02-17)

### Server Changes

- **remote**: add multiplexing feature w/ remote Mirakurun(s).

## 2.6.1 (2018-02-15)

...[Commit Logs before 2.6.1](https://github.com/Chinachu/Mirakurun/commits/877abea7af239804868ed39dc28d896d230e6c27)...
