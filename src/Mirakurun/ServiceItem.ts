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
import { Writable } from "stream";
import ChannelItem from "./ChannelItem.js";
import { UserRequest } from "./common.js";
import { Service } from "./db.js";
import Event from "./Event.js";
import TSFilter from "./TSFilter.js";
import _ from "./_.js";

export default class ServiceItem {
    static getId(networkId: number, serviceId: number): number {
        return parseInt(networkId + (serviceId / 100000).toFixed(5).slice(2), 10);
    }

    private _id: number;

    constructor(
        private _channel: ChannelItem,
        private _networkId: number,
        private _serviceId: number,
        private _transportStreamId: number,
        private _name?: string,
        private _type?: number,
        private _logoId?: number,
        private _remoteControlKeyId?: number,
        private _epgReady: boolean = false,
        private _epgUpdatedAt: number = 0
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

    get transportStreamId(): number {
        return this._transportStreamId;
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

    get epgReady(): boolean {
        return this._epgReady;
    }

    set epgReady(epgReady: boolean) {
        if (this._epgReady !== epgReady) {
            this._epgReady = epgReady;

            _.service.save();
            this._updated();
        }
    }

    get epgUpdatedAt(): number {
        return this._epgUpdatedAt;
    }

    set epgUpdatedAt(time: number) {
        if (this._epgUpdatedAt !== time) {
            this._epgUpdatedAt = time;

            _.service.save();
            this._updated();
        }
    }

    get channel(): ChannelItem {
        return this._channel;
    }

    export(): Service {
        const ret: Service = {
            id: this._id,
            serviceId: this._serviceId,
            networkId: this._networkId,
            transportStreamId: this._transportStreamId,
            name: this._name || "",
            type: this._type,
            logoId: this._logoId,
            remoteControlKeyId: this._remoteControlKeyId,
            epgReady: this._epgReady,
            epgUpdatedAt: this._epgUpdatedAt,
            channel: {
                type: this._channel.type,
                channel: this._channel.channel
            }
        };

        return ret;
    }

    getStream(userRequest: UserRequest, output: Writable): Promise<TSFilter> {
        return _.tuner.initServiceStream(this, userRequest, output);
    }

    getOrder(): number {
        let order: string;

        switch (this._channel.type) {
            case "GR":
                order = "1";
                break;
            case "BS":
                order = "2";
                break;
            case "CS":
                order = "3";
                break;
            case "SKY":
                order = "4";
                break;
        }

        if (this._remoteControlKeyId) {
            order += (100 + this._remoteControlKeyId).toString(10);
        } else {
            order += "200";
        }

        order += (10000 + this._serviceId).toString(10);

        return parseInt(order, 10);
    }

    private _updated(): void {
        Event.emit("service", "update", this.export());
    }
}
