/*
   Copyright 2021 kanreisa
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
import { ChildProcess, spawn } from "child_process";
import psTree from "ps-tree";
import { PassThrough, Readable, TransformOptions, Writable } from "stream";
import { promisify } from "util";
import { log } from "./log.js";
import { status } from "./status.js";

const psTreeAsync = promisify(psTree);

interface StreamOptions extends TransformOptions {
    readonly output: Writable;
    readonly command: string;
}

let idCounter = 0;

export class TSDecoder extends Writable {
    // output
    private _output: Writable;

    private _id: number;
    private _command: string;
    private _process: ChildProcess;
    private _readable: Readable;
    private _writable: Writable;

    private _isNew: boolean = false;
    private _timeout: NodeJS.Timeout;
    private _closed: boolean = false;
    private _deadCount: number = 0;

    constructor(opts: StreamOptions) {
        super();

        this._id = idCounter++;
        this._command = opts.command;

        this._output = opts.output;
        this._output.once("finish", this._close.bind(this));
        this._output.once("close", this._close.bind(this));

        Object.defineProperty(this, "writableLength", {
            get() {
                return opts.output.writableLength;
            }
        });
        Object.defineProperty(this, "writableHighWaterMark", {
            get() {
                return opts.output.writableHighWaterMark;
            }
        });

        this.once("close", this._close.bind(this));

        log.info("TSDecoder#%d has created (command=%s)", this._id, this._command);

        ++status.streamCount.decoder;

        this._spawn();
    }

    _write(chunk: Buffer, _encoding: string, callback: Function) {
        if (!this._writable) {
            callback();
            return;
        }

        if (this._isNew === true && this._process) {
            this._isNew = false;
            this._timeout = setTimeout(async () => {
                log.warn("TSDecoder#%d process will force killed because no respond...", this._id);
                await this._dead();
            }, 1500);
        }

        this._writable.write(chunk);
        callback();
    }

    async _final() {
        await this._close();
    }

    private _spawn(): void {
        if (this._closed === true || this._process) {
            return;
        }
        if (this._deadCount > 0) {
            ++status.errorCount.decoderRespawn;
            log.warn("TSDecoder#%d respawning because dead (count=%d)", this._id, this._deadCount);
        }

        const proc = (this._process = spawn(this._command));

        proc.once("close", async (code, signal) => {
            log.info("TSDecoder#%d process has closed with exit code=%d by signal `%s` (pid=%d)", this._id, code, signal, proc.pid);
            await this._dead();
        });

        proc.stderr.pipe(process.stderr);
        proc.stdout.once("data", () => clearTimeout(this._timeout));
        proc.stdout.on("data", chunk => this._output.write(chunk));

        this._readable = proc.stdout;
        this._writable = proc.stdin;

        this._isNew = true;

        log.info("TSDecoder#%d process has spawned by command `%s` (pid=%d)", this._id, this._command, proc.pid);
    }

    private async _dead(): Promise<void> {
        if (this._closed === true) {
            return;
        }

        log.error("TSDecoder#%d unexpected dead", this._id);

        ++this._deadCount;
        await this._kill();

        if (this._deadCount > 3) {
            this._fallback();
            return;
        }

        setTimeout(() => this._spawn(), 1500);
    }

    private _fallback(): void {
        const passThrough = new PassThrough({ allowHalfOpen: false });

        passThrough.on("data", chunk => this._output.write(chunk));

        this._readable = passThrough;
        this._writable = passThrough;

        log.warn("TSDecoder#%d has been fallback into pass-through stream", this._id);
    }

    private async _kill(): Promise<void> {
        if (this._process) {
            const children = [...(await psTreeAsync(this._process.pid))];

            // Kill only the parent process
            if (children.length === 0) {
                log.debug("TSDecoder#%d (pid=%d) kill...", this._id, this._process.pid);

                await new Promise<void>(resolve => {
                    const timer = setTimeout(() => {
                        log.warn("TSDecoder#%d will force killed because SIGTERM timed out...", this._id);
                        this._process.kill("SIGKILL");
                    }, 6000);
                    this._process.once("exit", () => {
                        clearTimeout(timer);
                        resolve();
                    });

                    // regular way
                    this._process.kill("SIGTERM");
                });
            }
            // Kill all children
            else {
                await new Promise<void>(resolve => {
                    const timer = setTimeout(() => {
                        log.warn("TSDecoder#%d will force killed because SIGTERM timed out...", this._id);
                        this._process.kill("SIGKILL");
                        resolve();
                    }, 6000);
                    this._process.once("exit", () => {
                        clearTimeout(timer);
                        resolve();
                    });

                    log.debug("TSDecoder#%d killing child processes (pid=%d): %s", this._id, this._process.pid, children.map(child => child.PID).join(", "));
                    children.reverse();
                    for (const child of children) {
                        try {
                            process.kill(Number(child.PID), "SIGKILL");
                        } catch (e) {
                            log.warn("TSDecoder#%d failed to kill child process (pid=%d): %s", this._id, child.PID, e);
                        }
                    }
                });
            }

            delete this._process;
        }

        if (this._readable) {
            this._readable.destroy();
            delete this._readable;
        }

        if (this._writable) {
            this._writable.destroy();
            delete this._writable;
        }
    }

    private async _close(): Promise<void> {
        if (this._closed === true) {
            return;
        }
        this._closed = true;

        await this._kill();

        if (this._output.writableEnded === false) {
            this._output.end();
        }
        this._output.removeAllListeners();
        delete this._output;

        --status.streamCount.decoder;

        log.info("TSDecoder#%d has closed (command=%s)", this._id, this._command);

        // close
        this.emit("close");
        this.emit("end");
    }
}
