[![Mirakurun](https://yabumi.cc/159e63f5c692b3b0dae47765.svg)](https://github.com/Chinachu/Mirakurun)

# Mirakurun

DVR Tuner Server Service for **[Chinachu](https://chinachu.moe/)** Air.

[![npm version][npm-img]][npm-url]
[![npm downloads][downloads-image]][downloads-url]
[![Linux Build][travis-img]][travis-url]
[![Dependency Status][dep-img]][dep-url]
[![devDependency Status][devdep-img]][devdep-url]
[![tip for next commit](https://tip4commit.com/projects/43158.svg)](https://tip4commit.com/github/Chinachu/Mirakurun)

## Features

* RESTful API (Open API) - has designed like HTTP version of Spinel
* Unix Sockets / TCP
* Advanced Tuner Process Management
* Priority Management
* Integrated MPEG-2 TS Parser, Filter
* Realtime EPG Parser
* Supports most Tuner Devices (chardev, DVB / ISDB-T, ISDB-S, DVB-S2)
* IPv6 Support
* [Multiplexing Mirakuruns](doc/Mirakuruns.md)

## Requirements / Supported Platforms

* [Node.js](http://nodejs.org/) `8.9.4 > 9` or `10.11.0 > 11`
* Linux w/ [PM2](http://pm2.keymetrics.io/)
* Win32 w/ [winser](https://github.com/jfromaniello/winser)

see: [doc/Platforms.md](doc/Platforms.md)

## Install

see: [doc/Platforms.md](doc/Platforms.md)

## CLI

**Only Linux / Darwin Platform**

### Administration

#### Init

Init as service manually.

```
mirakurun init
```

#### Config

```
mirakurun config [server|tuners|channels]
```

* Also you can config on Chinachu Web App.
* see: [doc/Configuration.md](doc/Configuration.md)

#### Log Stream

```
mirakurun log server
```

#### Service Management

```
mirakurun [status|start|stop|restart]
```

#### Version Info

```
mirakurun version
```

## Munin Plugin

**Required**
* [Munin](http://munin-monitoring.org/) `>=1.4.0`

### Installation

```
ln -s /usr/local/lib/node_modules/mirakurun/bin/munin-plugins/mirakurun_status.js /usr/share/munin/plugins/mirakurun_status
ln -s /usr/share/munin/plugins/mirakurun_status /etc/munin/plugins/mirakurun_status
# check
munin-run mirakurun_status
# apply
service munin-node restart
```

#### Workaround: `/usr/bin/env: node: No such file or directory`

create `/etc/munin/plugin-conf.d/mirakurun.conf` like below:

```
[mirakurun_*]
command /usr/local/bin/node %c
```

## PM2 Plus (Keymetrics)

You can use PM2 Plus to realtime monitoring if running by PM2.

* [PM2 Plus](https://pm2.io/plus/) (Keymetrics)

## Client Implementations

* [Mirakurun UI](https://github.com/Chinachu/Mirakurun-UI)
* [Rivarun](https://github.com/Chinachu/Rivarun)
* [BonDriver_Mirakurun](https://github.com/h-mineta/BonDriver_Mirakurun)

## Contributing

[CONTRIBUTING.md](.github/CONTRIBUTING.md)

## Supporting

* [Tip4Commit](https://tip4commit.com/github/Chinachu/Mirakurun) (BTC) - to Every Committers
* `1ND6fuKgQ8kKZnyoCRfJqe6cijsScd5Ttf` (BTC) - Directly to the Project Team

## Slack Community

* Join: https://slack.chinachu.moe/
* Login: https://chinachu.slack.com/

## License

[Apache License, Version 2.0](LICENSE)

**Commercial License/Support** is provided by [Pixely LLC](https://pixely.jp/).

[npm-img]: https://img.shields.io/npm/v/mirakurun.svg
[npm-url]: https://npmjs.org/package/mirakurun
[downloads-image]: https://img.shields.io/npm/dm/mirakurun.svg?style=flat
[downloads-url]: https://npmjs.org/package/mirakurun
[travis-img]: https://img.shields.io/travis/Chinachu/Mirakurun.svg
[travis-url]: https://travis-ci.org/Chinachu/Mirakurun
[dep-img]: https://david-dm.org/Chinachu/Mirakurun.svg
[dep-url]: https://david-dm.org/Chinachu/Mirakurun
[devdep-img]: https://david-dm.org/Chinachu/Mirakurun/dev-status.svg
[devdep-url]: https://david-dm.org/Chinachu/Mirakurun#info=devDependencies
