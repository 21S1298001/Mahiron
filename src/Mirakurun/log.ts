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
import { EventEmitter } from "events";
import { format } from "util";

export enum LogLevel {
    "FATAL" = -1,
    "ERROR" = 0,
    "WARN" = 1,
    "INFO" = 2,
    "DEBUG" = 3
}

export const config: { logLevel: LogLevel; maxLogHistory: number } = {
    logLevel: LogLevel.INFO,
    maxLogHistory: 1000
};

let offsetStr: string;
let offsetMS = 0;
if (/ GMT\+\d{4} /.test(new Date().toString()) === true) {
    const date = new Date();
    offsetStr = date.toString().match(/ GMT(\+\d{4}) /)[1];
    offsetStr = offsetStr.slice(0, 3) + ":" + offsetStr.slice(3, 5);
    offsetMS = date.getTimezoneOffset() * 60 * 1000;
}

class LogEvent extends EventEmitter {
    logs: string[] = [];

    emit(ev: "data", level: LogLevel, log: string): boolean {
        if (config.logLevel < level) {
            return;
        }

        this.logs.push(log);
        if (this.logs.length > config.maxLogHistory) {
            this.logs.shift();
        }

        switch (level) {
            case LogLevel.DEBUG:
                console.log(log);
                break;
            case LogLevel.INFO:
                console.info(log);
                break;
            case LogLevel.WARN:
                console.warn(log);
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(log);
                break;
        }

        return super.emit(ev, log);
    }

    debug(...msgs: any[]): void {
        this.emit("data", LogLevel.DEBUG, getLogString.call(null, "debug", arguments));
    }

    info(...msgs: any[]): void {
        this.emit("data", LogLevel.INFO, getLogString.call(null, "info", arguments));
    }

    warn(...msgs: any[]): void {
        this.emit("data", LogLevel.WARN, getLogString.call(null, "warn", arguments));
    }

    error(...msgs: any[]): void {
        this.emit("data", LogLevel.ERROR, getLogString.call(null, "error", arguments));
    }

    fatal(...msgs: any[]): void {
        this.emit("data", LogLevel.FATAL, getLogString.call(null, "fatal", arguments));
    }

    write(line): void {
        this.emit("data", LogLevel.INFO, getLogString("info", [line.slice(0, -1)]));
    }
}

export const log = new LogEvent();

function getLogString(lvstr: string, msgs: any[]) {
    let isoStr: string;

    if (offsetStr) {
        isoStr = new Date(Date.now() - offsetMS).toISOString();
        isoStr = isoStr.slice(0, -1) + offsetStr;
    } else {
        isoStr = new Date().toISOString();
    }

    return isoStr + " " + lvstr + ": " + format.apply(null, msgs);
}
