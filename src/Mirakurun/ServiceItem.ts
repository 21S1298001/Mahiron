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
import * as stream from "stream";
import * as common from "./common";
import _ from "./_";
import * as db from "./db";
import Event from "./Event";
import ChannelItem from "./ChannelItem";

export default class ServiceItem {

    static getId(networkId: number, serviceId: number): number {
        return parseInt(networkId + (serviceId / 100000).toFixed(5).slice(2), 10);
    }

    private _id: number;

    constructor(
        private _channel: ChannelItem,
        private _networkId: number,
        private _serviceId: number,
        private _name?: string,
        private _type?: number,
        private _logoId?: number,
        private _logoData?: string,
        private _remoteControlKeyId?: number
    ) {

        this._id = ServiceItem.getId(_networkId, _serviceId);
    }

    get id(): number {
        return this._id;
    }

    get networkId(): number {
        return this._networkId;
    }

    get serviceId(): number {
        return this._serviceId;
    }

    get name(): string {
        return this._name || "";
    }

    set name(name: string) {

        if (this._name !== name) {
            this._name = name;

            _.service.save();
            this._updated();
        }
    }

    get type(): number {
        return this._type;
    }

    set type(type: number) {

        if (this._type !== type) {
            this._type = type;

            _.service.save();
            this._updated();
        }
    }

    get logoId(): number {
        return this._logoId;
    }

    set logoId(logoId: number) {

        if (this._logoId !== logoId) {
            this._logoId = logoId;

            _.service.save();
            this._updated();
        }
    }

    get logoData(): Buffer {
        return Buffer.from(this._logoData, "base64");
    }

    set logoData(logo: Buffer) {

        if (this._logoData !== logo.toString("base64")) {
            this._logoData = logo.toString("base64");

            _.service.save();
            this._updated();
        }
    }

    get hasLogoData(): boolean {
        return !!this._logoData;
    }

    get remoteControlKeyId(): number {
        return this._remoteControlKeyId;
    }

    set remoteControlKeyId(id: number) {

        if (this._remoteControlKeyId !== id) {
            this._remoteControlKeyId = id;

            _.service.save();
            this._updated();
        }
    }

    get channel(): ChannelItem {
        return this._channel;
    }

    export(full: boolean = false): db.Service {

        const ret: db.Service = {
            id: this._id,
            serviceId: this._serviceId,
            networkId: this._networkId,
            name: this._name || "",
            type: this._type,
            logoId: this._logoId,
            remoteControlKeyId: this._remoteControlKeyId,
            channel: {
                type: this._channel.type,
                channel: this._channel.channel
            }
        };

        if (full === true) {
            ret.logoData = this._logoData;
        }

        return ret;
    }

    getStream(userRequest: common.UserRequest): Promise<stream.Readable> {
        return _.tuner.getServiceStream(this, userRequest);
    }

    private _updated(): void {
        Event.emit("service", "update", this.export());
    }
}
