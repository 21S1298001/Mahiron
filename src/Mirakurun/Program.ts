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
import sift from "sift";
import { _ } from "./_.js";
import { sleep, updateObject } from "./common.js";
import { Program as IProgram, loadPrograms, savePrograms } from "./db.js";
import { Event, EventType } from "./Event.js";
import { log } from "./log.js";

export function getProgramItemId(networkId: number, serviceId: number, eventId: number): number {
    return parseInt(`${networkId}${serviceId.toString(10).padStart(5, "0")}${eventId.toString(10).padStart(5, "0")}`, 10);
}

export class Program {
    private _itemMap = new Map<number, IProgram>();
    private _saveTimerId: NodeJS.Timeout;
    private _emitTimerId: NodeJS.Timeout;
    private _emitRunning = false;
    private _emitPrograms = new Map<IProgram, EventType>();
    private _programGCInterval = _.config.server.programGCInterval || 1000 * 60 * 60; // 1 hour

    constructor() {}

    async setup() {
        await this._load();

        setTimeout(this._gc.bind(this), this._programGCInterval);
    }

    get itemMap(): Map<number, IProgram> {
        return this._itemMap;
    }

    add(item: IProgram, firstAdd: boolean = false): void {
        if (this.exists(item.id)) {
            return;
        }

        if (firstAdd === false) {
            this._findAndRemoveConflicts(item);
        }

        this._itemMap.set(item.id, item);

        if (firstAdd === false) {
            this._emitPrograms.set(item, "create");
        }

        this.save();
    }

    get(id: number): IProgram | null {
        return this._itemMap.get(id) || null;
    }

    set(id: number, props: Partial<IProgram>): void {
        const item = this.get(id);
        if (item && updateObject(item, props) === true) {
            if (props.startAt || props.duration) {
                this._findAndRemoveConflicts(item);
            }
            this._emitPrograms.set(item, "update");
            this.save();
        }
    }

    remove(id: number): void {
        if (this._itemMap.delete(id)) {
            this.save();
        }
    }

    exists(id: number): boolean {
        return this._itemMap.has(id);
    }

    findByQuery(query: object): IProgram[] {
        return Array.from(this._itemMap.values()).filter(sift.default(query));
    }

    findByNetworkId(networkId: number): IProgram[] {
        const items = [];

        for (const item of this._itemMap.values()) {
            if (item.networkId === networkId) {
                items.push(item);
            }
        }

        return items;
    }

    findByNetworkIdAndTime(networkId: number, time: number): IProgram[] {
        const items = [];

        for (const item of this._itemMap.values()) {
            if (item.networkId === networkId && item.startAt <= time && item.startAt + item.duration > time) {
                items.push(item);
            }
        }

        return items;
    }

    findByNetworkIdAndReplace(networkId: number, programs: IProgram[]): void {
        let count = 0;

        for (const item of [...this._itemMap.values()].reverse()) {
            if (item.networkId === networkId) {
                // Calling `this.remove(item)` here is safe.  Because that never
                // changes the Array object we're iterating here.
                this.remove(item.id);
                --count;
            }
        }

        for (const program of programs) {
            this.add(program, true);
            ++count;
        }

        log.debug("programs replaced (networkId=%d, count=%d)", networkId, count);

        this.save();
    }

    save(): void {
        clearTimeout(this._emitTimerId);
        this._emitTimerId = setTimeout(async () => await this._emit(), 1000);
        clearTimeout(this._saveTimerId);
        this._saveTimerId = setTimeout(async () => await this._save(), 1000 * 10);
    }

    private async _load(): Promise<void> {
        log.debug("loading programs...");

        const now = Date.now();
        let dropped = false;

        const items = await loadPrograms(_.configIntegrity.channels);
        for (const item of items) {
            if (item.networkId === undefined) {
                dropped = true;
                return;
            }
            if (now > item.startAt + item.duration) {
                dropped = true;
                return;
            }

            this.add(item, true);
        }

        if (dropped) {
            this.save();
        }
    }

    private _findAndRemoveConflicts(added: IProgram): void {
        const addedEndAt = added.startAt + added.duration;

        for (const item of this._itemMap.values()) {
            if (item.networkId === added.networkId && item.serviceId === added.serviceId && item.id !== added.id) {
                const itemEndAt = item.startAt + item.duration;
                if (((added.startAt <= item.startAt && item.startAt < addedEndAt) || (item.startAt <= added.startAt && added.startAt < itemEndAt)) && (!item._pf || added._pf)) {
                    this.remove(item.id);
                    Event.emit("program", "remove", { id: item.id });

                    log.debug("ProgramItem#%d (networkId=%d, serviceId=%d, eventId=%d) has removed by overlapped ProgramItem#%d (eventId=%d)", item.id, item.networkId, item.serviceId, item.eventId, added.id, added.eventId);
                }
            }
        }
    }

    private async _emit(): Promise<void> {
        if (this._emitRunning) {
            return;
        }
        this._emitRunning = true;

        for (const [item, eventType] of this._emitPrograms) {
            this._emitPrograms.delete(item);
            Event.emit("program", eventType, item);

            await sleep(10);
        }

        this._emitRunning = false;
        if (this._emitPrograms.size > 0) {
            this._emit();
        }
    }

    private async _save(): Promise<void> {
        log.debug("saving %d programs...", this._itemMap.size);

        await savePrograms(Array.from(this._itemMap.values()), _.configIntegrity.channels);
    }

    private _gc(): void {
        log.debug("Program GC has queued");

        _.queue?.add(async () => {
            const shortExp = Date.now() - 1000 * 60 * 60 * 3; // 3 hour
            const longExp = Date.now() - 1000 * 60 * 60 * 24; // 24 hours
            const maximum = Date.now() + 1000 * 60 * 60 * 24 * 9; // 9 days
            let count = 0;

            for (const item of this._itemMap.values()) {
                if ((item.duration === 1 ? longExp : shortExp) > item.startAt + item.duration || maximum < item.startAt) {
                    ++count;
                    this.remove(item.id);
                }
            }

            setTimeout(this._gc.bind(this), this._programGCInterval);

            log.info("Program GC has finished and removed %d programs", count);
        });
    }
}
