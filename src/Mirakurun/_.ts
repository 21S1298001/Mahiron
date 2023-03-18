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
import Channel from "./Channel";
import { Channel as IChannel, Server as IServer, Tuner as ITuner } from "./config";
import Event from "./Event";
import Program from "./Program";
import Server from "./Server";
import Service from "./Service";
import Tuner from "./Tuner";

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
}

const _: Shared = {
    config: {},
    configIntegrity: {
        channels: ""
    }
};

export default _;
