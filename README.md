# Mahiron

Yet another DVR Tuner Server for Japanese TV, forked from [Chinachu/Mirakurun](https://github.com/Chinachu/Mirakurun).

Our goal is to maintain compatibility with Mirakurun while making modifications for ongoing development, fixing bugs, and adding new features to the extent that they do not destroy compatibility.

We will also be aware of compatibility with other tuner management software, such as Mirakc, to enhance interoperability.

## Features

Mirakurun 3.9.0-rc.2 Features +

-   Various library updates
-   Removal of tools and features that are likely to be used infrequently
-   Refactoring for continuous development
-   Added random selection of tuners
-   Add TSID field to API
-   Add a field for the channel the tuner is selecting to the API
-   Add channel type substitution in tuner commands

## Requirements

-   Node.js 18 or later

## Setup

Build Dockerfile with command: `$ docker build -t mahiron .`

or `$ pnpm i && pnpm run build && pnpm run start`

## Upcomings

-   Docker image distribution
-   Mirakc-compatible API implementation (e.g. /events)
-   Refactoring to improve stability
-   Bug fixes
-   UI redesign
-   etc.

## Copyright

Copyright 2023 21S1298001

Licensed under the Apache License, Version 2.0.

Original copyright of Mirakurun:

> &copy; 2016- [kanreisa](https://github.com/kanreisa).
>
> -   Code: [Apache License, Version 2.0](LICENSE)
> -   Docs: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
> -   Logo: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
