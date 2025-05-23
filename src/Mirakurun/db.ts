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
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { ChannelType } from "./common.js";
import { exists } from "./fs.js";
import { log } from "./log.js";

export interface Service {
    id: number;
    serviceId: number;
    networkId: number;
    transportStreamId: number;
    name: string;
    type: number;
    logoId: number;
    remoteControlKeyId?: number;
    epgReady?: boolean;
    epgUpdatedAt?: number;
    channel: Channel;

    /** @deprecated */
    logoData?: string; // base64
}

export interface Channel {
    type: ChannelType;
    channel: string;
}

export interface Program {
    id: number;
    eventId: number;
    serviceId: number;
    networkId: number;
    startAt: number;
    duration: number;
    isFree: boolean;

    name?: string;
    description?: string;
    genres?: ProgramGenre[];
    video?: ProgramVideo;
    audios?: ProgramAudio[];

    extended?: {
        [description: string]: string;
    };

    series?: ProgramSeries;

    relatedItems?: ProgramRelatedItem[];

    /** (internal) indicates EIT[p/f] received */
    _pf?: true;
}

export interface ProgramGenre {
    lv1: number;
    lv2: number;
    un1: number;
    un2: number;
}

export interface ProgramVideo {
    type: ProgramVideoType;
    resolution: string;

    streamContent: number;
    componentType: number;
}

export type ProgramVideoType = "mpeg2" | "h.264" | "h.265";

export type ProgramVideoResolution = "240p" | "480i" | "480p" | "720p" | "1080i" | "1080p" | "2160p" | "4320p";

export interface ProgramAudio {
    /** component_type
     * - 0x01 - 1/0 mode (single-mono)
     * - 0x02 - 1/0 + 1/0 mode (dual-mono)
     * - 0x03 - 2/0 mode (stereo)
     * - 0x07 - 3/1 mode
     * - 0x08 - 3/2 mode
     * - 0x09 - 3/2 + LFE mode
     */
    componentType: number;
    componentTag: number;
    isMain: boolean;
    samplingRate: ProgramAudioSamplingRate;
    /** ISO_639_language_code, ISO_639_language_code_2
     * - this `#length` will `2` if dual-mono multi-lingual.
     */
    langs: ProgramAudioLanguageCode[];
}

export enum ProgramAudioSamplingRate {
    "16kHz" = 16000,
    "22.05kHz" = 22050,
    "24kHz" = 24000,
    "32kHz" = 32000,
    "44.1kHz" = 44100,
    "48kHz" = 48000
}

export type ProgramAudioLanguageCode = "jpn" | "eng" | "deu" | "fra" | "ita" | "rus" | "zho" | "kor" | "spa" | "etc";

export interface ProgramSeries {
    id: number;
    repeat: number;
    pattern: number;
    expiresAt: number;
    episode: number;
    lastEpisode: number;
    name: string;
}

export type ProgramRelatedItemType = "shared" | "relay" | "movement";

export interface ProgramRelatedItem {
    type: ProgramRelatedItemType;
    networkId?: number;
    serviceId: number;
    eventId: number;
}

export async function loadServices(integrity: string): Promise<Service[]> {
    return await load(process.env.SERVICES_DB_PATH, integrity);
}

export async function saveServices(data: Service[], integrity: string): Promise<void> {
    return await save(process.env.SERVICES_DB_PATH, data, integrity);
}

export async function loadPrograms(integrity: string): Promise<Program[]> {
    return await load(process.env.PROGRAMS_DB_PATH, integrity);
}

export async function savePrograms(data: Program[], integrity: string): Promise<void> {
    return await save(process.env.PROGRAMS_DB_PATH, data, integrity);
}

async function load(path: string, integrity: string) {
    log.info("load db `%s` w/ integrity (%s)", path, integrity);

    if (await exists(path)) {
        const json = await readFile(path, { encoding: "utf8" });
        try {
            const array: any[] = JSON.parse(json);
            if (array.length > 0 && array[0].__integrity__) {
                if (integrity === array[0].__integrity__) {
                    log.info("db `%s` loaded w/ integrity (%s), size (%d)", path, integrity, array.length - 1);
                    return array.slice(1);
                } else {
                    log.warn("db `%s` integrity check has failed", path);
                    return [];
                }
            }
            log.info("db `%s` loaded w/ integrity (%s), size (%d)", path, integrity, array.length);
            return array;
        } catch (e) {
            log.error("db `%s` is broken (%s: %s)", path, e.name, e.message);
            return [];
        }
    } else {
        log.info("db `%s` is not exists", path);
        return [];
    }
}

async function save(path: string, data: any[], integrity: string, retrying = false): Promise<void> {
    log.info("save db `%s` w/ integirty (%s), size (%d)", path, integrity, data.length);

    data.unshift({ __integrity__: integrity });

    try {
        await writeFile(path, JSON.stringify(data));
    } catch (e) {
        if (retrying === false) {
            // mkdir if not exists
            const dirPath = dirname(path);
            if (!(await exists(dirPath))) {
                try {
                    mkdir(dirPath, { recursive: true });
                } catch (e) {
                    throw e;
                }
            }
            // retry
            return save(path, data, integrity, true);
        }
        throw e;
    }
}
