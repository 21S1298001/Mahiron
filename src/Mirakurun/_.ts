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
import PromiseQueue from "promise-queue";
import { Channel } from "./Channel.js";
import { Channel as IChannel, Server as IServer, Tuner as ITuner } from "./config.js";
import { Event } from "./Event.js";
import { Program } from "./Program.js";
import { Server } from "./Server.js";
import { Service } from "./Service.js";
import { Tuner } from "./Tuner.js";

interface Shared {
    readonly config: {
        server?: IServer;
        channels?: IChannel[];
        tuners?: ITuner[];
    };
    readonly configIntegrity: {
        channels: string;
    };
    event?: Event;
    tuner?: Tuner;
    channel?: Channel;
    service?: Service;
    program?: Program;
    server?: Server;
    queue?: PromiseQueue;
}

export const _: Shared = {
    config: {},
    configIntegrity: {
        channels: ""
    }
};
