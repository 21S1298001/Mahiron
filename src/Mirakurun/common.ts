/*
   Copyright 2016 kanreisa

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
import ChannelItem from "./ChannelItem";

export interface User {
    readonly id: string;
    readonly priority: number;
    readonly agent?: string;
    readonly url?: string;
    readonly disableDecoder?: boolean;
    readonly streamSetting?: StreamSetting;
    readonly streamInfo?: StreamInfo;
}

export type UserRequest = Omit<User, "streamSetting">;

interface StreamSetting {
    channel: ChannelItem;
    networkId?: number;
    serviceId?: number;
    eventId?: number;
    noProvide?: boolean;
    parseNIT?: boolean;
    parseSDT?: boolean;
    parseEIT?: boolean;
}

export interface StreamInfo {
    [PID: string]: {
        packet: number;
        drop: number;
    };
}

export enum ChannelTypes {
    "GR" = "GR",
    "BS" = "BS",
    "CS" = "CS",
    "SKY" = "SKY"
}

export type ChannelType = keyof typeof ChannelTypes;

export function extendObject<T, U>(b: T, a: U): T {

    for (const k in a) {
        (<any> b)[k] = a[k];
    }

    return b;
}

export function updateObject<T, U>(b: T, a: U): boolean {

    let updated = false;

    for (const k in a) {
        if ((<any> b)[k] !== a[k]) {
            if (updated === false) {
                updated = true;
            }
            (<any> b)[k] = a[k];
        }
    }

    return updated;
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
