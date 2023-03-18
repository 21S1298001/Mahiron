/*
   Copyright 2016 kanreisa
   Copyright 2023 21S1298001

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
import { TsChar } from "@chinachu/aribts";
import { EIT } from "@chinachu/aribts/lib/table/eit";
import { getTimeFromBCD24, getTimeFromMJD } from "./common";
import { ProgramAudio, ProgramAudioLanguageCode, ProgramGenre, ProgramRelatedItem, ProgramVideoResolution, ProgramVideoType } from "./db";
import { getProgramItemId } from "./Program";
import _ from "./_";

const STREAM_CONTENT = {
    1: "mpeg2",
    5: "h.264",
    9: "h.265"
};

const COMPONENT_TYPE = {
    0x01: "480i",
    0x02: "480i",
    0x03: "480i",
    0x04: "480i",
    0x83: "4320p",
    0x91: "2160p",
    0x92: "2160p",
    0x93: "2160p",
    0x94: "2160p",
    0xa1: "480p",
    0xa2: "480p",
    0xa3: "480p",
    0xa4: "480p",
    0xb1: "1080i",
    0xb2: "1080i",
    0xb3: "1080i",
    0xb4: "1080i",
    0xc1: "720p",
    0xc2: "720p",
    0xc3: "720p",
    0xc4: "720p",
    0xd1: "240p",
    0xd2: "240p",
    0xd3: "240p",
    0xd4: "240p",
    0xe1: "1080p",
    0xe2: "1080p",
    0xe3: "1080p",
    0xe4: "1080p",
    0xf1: "180p",
    0xf2: "180p",
    0xf3: "180p",
    0xf4: "180p"
};

const SAMPLING_RATE = {
    0: -1,
    1: 16000,
    2: 22050,
    3: 24000,
    4: -1,
    5: 32000,
    6: 44100,
    7: 48000
};

const UNKNOWN_START_TIME = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff]);
const UNKNOWN_DURATION = Buffer.from([0xff, 0xff, 0xff]);

const ISO_639_LANG_CODE = {
    jpn: Buffer.from("6A706E", "hex"),
    eng: Buffer.from("656E67", "hex"),
    deu: Buffer.from("646575", "hex"),
    fra: Buffer.from("667261", "hex"),
    ita: Buffer.from("697461", "hex"),
    rus: Buffer.from("727573", "hex"),
    zho: Buffer.from("7A686F", "hex"),
    kor: Buffer.from("6B6F72", "hex"),
    spa: Buffer.from("737061", "hex"),
    etc: Buffer.from("657463", "hex")
};

type TableId = number;
type VersionRecord<T = number> = Record<TableId, T>;

interface EventState {
    version: VersionRecord;
    programId: number;

    short: {
        version: VersionRecord; // basic
    };
    extended: {
        version: VersionRecord; // extended
        _descs?: {
            item_description_length: number;
            item_description_char: Buffer;
            item_length: number;
            item_char: Buffer;
        }[][];
        _done?: boolean;
    };
    component: {
        version: VersionRecord; // basic
    };
    content: {
        version: VersionRecord; // basic
    };
    audio: {
        version: VersionRecord<VersionRecord>; // basic
        _audios: { [componentTag: number]: ProgramAudio };
    };
    series: {
        version: VersionRecord; // basic
    };
    group: {
        version: VersionRecord<VersionRecord>; // basic
        _groups: ProgramRelatedItem[][];
    };

    present?: true;
}

// forked from rndomhack/node-aribts/blob/1e7ef94bba3d6ac26aec764bf24dde2c2852bfcb/lib/epg.js
export default class EPG {
    private _epg: { [networkId: number]: { [serviceId: number]: { [eventId: number]: EventState } } } = {};

    write(eit: EIT) {
        if (!this._epg) {
            return;
        }

        const isPF = eit.table_id === 0x4e || eit.table_id === 0x4f;

        if (isPF && eit.section_number > 1) {
            return;
        }

        const isP = isPF && eit.section_number === 0;

        const networkId = eit.original_network_id;

        if (!this._epg[networkId]) {
            this._epg[networkId] = {};
        }

        if (!this._epg[networkId][eit.service_id]) {
            this._epg[networkId][eit.service_id] = {};
        }

        const service = this._epg[networkId][eit.service_id];

        for (const e of eit.events) {
            let state: EventState;

            if (!service[e.event_id]) {
                const id = getProgramItemId(networkId, eit.service_id, e.event_id);
                if (!_.program.exists(id)) {
                    if (UNKNOWN_START_TIME.compare(e.start_time) === 0) {
                        continue;
                    }
                    const programItem = {
                        id,
                        eventId: e.event_id,
                        serviceId: eit.service_id,
                        networkId: networkId,
                        startAt: getTimeFromMJD(e.start_time),
                        duration: UNKNOWN_DURATION.compare(e.duration) === 0 ? 1 : getTimeFromBCD24(e.duration),
                        isFree: e.free_CA_mode === 0,
                        _pf: isPF || undefined
                    };
                    _.program.add(programItem);
                }

                state = {
                    version: {},
                    programId: id,

                    short: {
                        version: {}
                    },
                    extended: {
                        version: {}
                    },
                    component: {
                        version: {}
                    },
                    content: {
                        version: {}
                    },
                    audio: {
                        version: {},
                        _audios: {}
                    },
                    series: {
                        version: {}
                    },
                    group: {
                        version: {},
                        _groups: []
                    },

                    present: isP || undefined
                };

                service[e.event_id] = state;
            } else {
                state = service[e.event_id];

                if (!state.present && isP) {
                    state.present = true;
                }

                if ((!state.present || (state.present && isP)) && isOutOfDate(eit, state.version)) {
                    state.version[eit.table_id] = eit.version_number;

                    if (UNKNOWN_START_TIME.compare(e.start_time) !== 0) {
                        _.program.set(state.programId, {
                            startAt: getTimeFromMJD(e.start_time),
                            duration: UNKNOWN_DURATION.compare(e.duration) === 0 ? 1 : getTimeFromBCD24(e.duration),
                            isFree: e.free_CA_mode === 0,
                            _pf: isPF || undefined
                        });
                    }
                }
            }

            for (const d of e.descriptors) {
                switch (d.descriptor_tag) {
                    // short_event
                    case 0x4d:
                        if (!isOutOfDate(eit, state.short.version)) {
                            break;
                        }
                        state.short.version[eit.table_id] = eit.version_number;

                        _.program.set(state.programId, {
                            name: new TsChar(d.event_name_char).decode(),
                            description: new TsChar(d.text_char).decode()
                        });

                        break;

                    // extended_event
                    case 0x4e:
                        if (isOutOfDate(eit, state.extended.version)) {
                            state.extended.version[eit.table_id] = eit.version_number;
                            state.extended._descs = new Array(d.last_descriptor_number + 1);
                            state.extended._done = false;
                        } else if (state.extended._done) {
                            break;
                        }

                        if (!state.extended._descs[d.descriptor_number]) {
                            state.extended._descs[d.descriptor_number] = d.items;

                            let comp = true;
                            for (const descs of state.extended._descs) {
                                if (typeof descs === "undefined") {
                                    comp = false;
                                    break;
                                }
                            }
                            if (comp === false) {
                                break;
                            }

                            const extended: any = {};

                            let current = "";
                            for (const descs of state.extended._descs) {
                                for (const desc of descs) {
                                    const key = desc.item_description_length === 0 ? current : new TsChar(desc.item_description_char).decode();
                                    current = key;
                                    extended[key] = extended[key] ? Buffer.concat([extended[key], desc.item_char]) : desc.item_char;
                                }
                            }
                            for (const key of Object.keys(extended)) {
                                extended[key] = new TsChar(extended[key]).decode();
                            }

                            _.program.set(state.programId, {
                                extended: extended
                            });

                            delete state.extended._descs;
                            state.extended._done = true; // done
                        }

                        break;

                    // component
                    case 0x50:
                        if (!isOutOfDate(eit, state.component.version)) {
                            break;
                        }
                        state.component.version[eit.table_id] = eit.version_number;

                        _.program.set(state.programId, {
                            video: {
                                type: <ProgramVideoType>STREAM_CONTENT[d.stream_content] || null,
                                resolution: <ProgramVideoResolution>COMPONENT_TYPE[d.component_type] || null,

                                streamContent: d.stream_content,
                                componentType: d.component_type
                            }
                        });

                        break;

                    // content
                    case 0x54:
                        if (!isOutOfDate(eit, state.content.version)) {
                            break;
                        }
                        state.content.version[eit.table_id] = eit.version_number;

                        _.program.set(state.programId, {
                            genres: d.contents.map(getGenre)
                        });

                        break;

                    // audio component
                    case 0xc4:
                        if (!isOutOfDateLv2(eit, state.audio.version, d.component_tag)) {
                            break;
                        }
                        state.audio.version[eit.table_id][d.component_tag] = eit.version_number;

                        const langs = [getLangCode(d.ISO_639_language_code)];
                        if (d.ISO_639_language_code_2) {
                            langs.push(getLangCode(d.ISO_639_language_code_2));
                        }

                        state.audio._audios[d.component_tag] = {
                            componentType: d.component_type,
                            componentTag: d.component_tag,
                            isMain: d.main_component_flag === 1,
                            samplingRate: SAMPLING_RATE[d.sampling_rate],
                            langs
                        };

                        _.program.set(state.programId, {
                            audios: Object.values(state.audio._audios)
                        });

                        break;

                    // series
                    case 0xd5:
                        if (!isOutOfDate(eit, state.series.version)) {
                            break;
                        }
                        state.series.version[eit.table_id] = eit.version_number;

                        _.program.set(state.programId, {
                            series: {
                                id: d.series_id,
                                repeat: d.repeat_label,
                                pattern: d.program_pattern,
                                expiresAt: d.expire_date_valid_flag === 1 ? getTimeFromMJD(Buffer.from(d.expire_date.toString(16), "hex")) : -1,
                                episode: d.episode_number,
                                lastEpisode: d.last_episode_number,
                                name: new TsChar(d.series_name_char).decode()
                            }
                        });

                        break;

                    // event_group
                    case 0xd6:
                        if (!isOutOfDateLv2(eit, state.group.version, d.group_type)) {
                            break;
                        }
                        state.group.version[eit.table_id][d.group_type] = eit.version_number;

                        state.group._groups[d.group_type] = d.group_type < 4 ? d.events.map(getRelatedProgramItem.bind(d)) : d.other_network_events.map(getRelatedProgramItem.bind(d));

                        _.program.set(state.programId, {
                            relatedItems: state.group._groups.flat()
                        });

                        break;
                } // <- switch
            } // <- for
        } // <- for
    }

    end() {
        if (this._epg) {
            delete this._epg;
        }
    }
}

function isOutOfDate(eit: EIT, versionRecord: VersionRecord): boolean {
    if ((versionRecord[0x4e] !== undefined && eit.table_id !== 0x4e) || (versionRecord[0x4f] !== undefined && eit.table_id !== 0x4e && eit.table_id !== 0x4f)) {
        return false;
    }

    return versionRecord[eit.table_id] !== eit.version_number;
}

function isOutOfDateLv2(eit: EIT, versionRecord: VersionRecord<VersionRecord>, lv2: number): boolean {
    if ((versionRecord[0x4e] !== undefined && eit.table_id !== 0x4e) || (versionRecord[0x4f] !== undefined && eit.table_id !== 0x4e && eit.table_id !== 0x4f)) {
        return false;
    }
    if (versionRecord[eit.table_id] === undefined) {
        versionRecord[eit.table_id] = {};
    }

    return versionRecord[eit.table_id][lv2] !== eit.version_number;
}

function getGenre(content: any): ProgramGenre {
    return {
        lv1: content.content_nibble_level_1,
        lv2: content.content_nibble_level_2,
        un1: content.user_nibble_1,
        un2: content.user_nibble_2
    };
}

function getLangCode(buffer: Buffer): ProgramAudioLanguageCode {
    for (const code in ISO_639_LANG_CODE) {
        if (ISO_639_LANG_CODE[code].compare(buffer) === 0) {
            return code as ProgramAudioLanguageCode;
        }
    }
    return "etc";
}

function getRelatedProgramItem(event: any): ProgramRelatedItem {
    return {
        type: this.group_type === 1 ? "shared" : this.group_type === 2 || this.group_type === 4 ? "relay" : "movement",
        networkId: event.original_network_id,
        serviceId: event.service_id,
        eventId: event.event_id
    };
}
