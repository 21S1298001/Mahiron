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
Buffer.poolSize = 0; // disable memory pool

import { config } from "dotenv";
config();

import { exec } from "child_process";
import { promisify } from "util";
import { createHash } from "crypto";

if (process.platform === "linux") {
    const execAsync = promisify(exec);

    execAsync(`renice -n -10 -p ${process.pid}`).catch(e => {
        console.warn("failed to renice\n" + (e as Error).message);
    });
    execAsync(`ionice -c 1 -n 7 -p ${process.pid}`).catch(e => {
        console.warn("failed to ionice\n" + (e as Error).message);
    });
}

process.title = "Mahiron: Server";

process.on("uncaughtException", err => {
    ++status.errorCount.uncaughtException;
    console.error(err.stack);
});
process.on("unhandledRejection", err => {
    ++status.errorCount.unhandledRejection;
    console.error(err);
});

setEnv("SERVER_CONFIG_PATH", "/usr/local/etc/mahiron/server.yml");
setEnv("TUNERS_CONFIG_PATH", "/usr/local/etc/mahiron/tuners.yml");
setEnv("CHANNELS_CONFIG_PATH", "/usr/local/etc/mahiron/channels.yml");
setEnv("SERVICES_DB_PATH", "/usr/local/var/db/mahiron/services.json");
setEnv("PROGRAMS_DB_PATH", "/usr/local/var/db/mahiron/programs.json");
setEnv("LOGO_DATA_DIR_PATH", "/usr/local/var/db/mahiron/logo-data");

import { Channel } from "./Mirakurun/Channel.js";
import { Event } from "./Mirakurun/Event.js";
import { Program } from "./Mirakurun/Program.js";
import { Server } from "./Mirakurun/Server.js";
import { Service } from "./Mirakurun/Service.js";
import { Tuner } from "./Mirakurun/Tuner.js";
import { _ } from "./Mirakurun/_.js";
import { loadChannels, loadServer, loadTuners } from "./Mirakurun/config.js";
import { log, config as logConfig } from "./Mirakurun/log.js";
import { status } from "./Mirakurun/status.js";

_.config.server = await loadServer();
_.config.channels = await loadChannels();
_.configIntegrity.channels = createHash("sha256").update(JSON.stringify(_.config.channels)).digest("base64");
_.config.tuners = await loadTuners();

if (typeof _.config.server.logLevel === "number") {
    logConfig.logLevel = _.config.server.logLevel;
}
if (typeof _.config.server.maxLogHistory === "number") {
    logConfig.maxLogHistory = _.config.server.maxLogHistory;
}

_.event = new Event();
_.tuner = new Tuner();
_.channel = new Channel();
_.service = new Service();
await _.service.setup();
_.program = new Program();
await _.program.setup();
_.server = new Server();

if (process.env.SETUP === "true") {
    log.info("setup is done.");
    process.exit(0);
}

await _.server.init();

function setEnv(name: string, value: string) {
    process.env[name] = process.env[name] || value;
}
