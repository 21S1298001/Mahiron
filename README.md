# Mahiron is over

Mahironは[Chinachu/Mirakurun](https://github.com/Chinachu/Mirakurun)のフォークとして、継続的な改善を目標として開発を行ってきました。

しかし、開発に割ける時間を継続的に取る事ができず、また大規模なソフトウェアのため機能追加や修正のコストが高く、結果として活発に開発を進める事ができていませんでした。

また、2025年に入りMirakurunの開発が活性化しており、様々な改善が行われています。

そのため、Mahironは一定の役割を果たしたと考え、開発を休止する事にしました。

Mahironで行われた変更は、MirakurunへのPRとして出来る限り還元していきたいと考えています。

MirakurunベースのMahironはここで終了しますが、Mahironの開発を通じて得られた知見は、今後の開発に活かしていきたいと考えています。

短い間ではありましたが、Mahironを使用していただき、また開発に協力していただき、本当にありがとうございました。

-----

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

Mahiron's logo is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.

Original copyright of Mirakurun:

> &copy; 2016- [kanreisa](https://github.com/kanreisa).
>
> -   Code: [Apache License, Version 2.0](LICENSE)
> -   Docs: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
> -   Logo: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
