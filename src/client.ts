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
import { readFile } from "fs/promises";
import { Agent, IncomingHttpHeaders, IncomingMessage, request, RequestOptions } from "http";
import { load } from "js-yaml";
import { OpenAPIV2 } from "openapi-types";
import { stringify } from "querystring";
import {
    Channel,
    ChannelScanMode,
    ChannelType,
    ConfigChannels,
    ConfigServer,
    ConfigTuners,
    Error,
    EventId,
    EventResource,
    EventType,
    NetworkId,
    Program,
    ProgramId,
    Service,
    ServiceId,
    ServiceItemId,
    Status,
    TunerDevice,
    TunerProcess,
    Version
} from "../api.js";

const pkg = JSON.parse(await readFile("./package.json", { encoding: "utf-8" }));

const spec = load(await readFile("./api.yml", { encoding: "utf8" })) as OpenAPIV2.Document;

export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface RequestOption {
    /** positive integer */
    priority?: number;
    /** request headers */
    headers?: { [key: string]: string };
    /** request query */
    query?: { [key: string]: any };
    /** request body */
    body?: string | object;
    /** AbortSignal */
    signal?: AbortSignal;
}

export interface Response {
    status: number;
    statusText: string;
    contentType: string;
    headers: IncomingHttpHeaders;
    isSuccess: boolean;
    body?: any | string | Buffer;
}

export interface ErrorResponse extends Response {
    body?: Error;
}

export interface ChannelsQuery {
    type?: ChannelType;
    channel?: string;
    name?: string;
}

export interface ProgramsQuery {
    networkId?: NetworkId;
    serviceId?: ServiceId;
    eventId?: EventId;
}

export interface EventsQuery {
    resource?: EventResource;
    type?: EventType;
}

export interface ServicesQuery {
    serviceId?: ServiceId;
    networkId?: NetworkId;
    name?: string;
    type?: number;
    "channel.type"?: ChannelType;
    "channel.channel"?: string;
}

export interface ChannelScanOption {
    dryRun?: boolean;
    type?: ChannelType;
    minCh?: number;
    maxCh?: number;
    minSubCh?: number;
    maxSubCh?: number;
    useSubCh?: boolean;
    scanMode?: ChannelScanMode;
    setDisabledOnAdd?: boolean;
    refresh?: boolean;
}

export class ErrorResponse implements ErrorResponse {
    constructor(response: ErrorResponse) {
        this.status = response.status;
        this.statusText = response.statusText;
        this.contentType = response.contentType;
        this.headers = response.headers;
        this.isSuccess = response.isSuccess;
        this.body = response.body;
    }
}

export class Client {
    basePath = spec.basePath;
    docsPath = "/docs";
    /** positive integer */
    priority = 0;
    host = "";
    port = 40772;
    socketPath = process.platform === "win32" ? "\\\\.\\pipe\\mahiron" : "/var/run/mahiron.sock";
    agent!: Agent | boolean;
    /** provide User-Agent string to identify client. */
    userAgent = "";

    private _userAgent = `MahironClient/${pkg.version} Node/${process.version} (${process.platform})`;
    private _docs!: OpenAPIV2.Document;

    request(method: RequestMethod, path: string, option: RequestOption = {}): Promise<Response> | Promise<ErrorResponse> {
        return new Promise((resolve, reject) => {
            this._httpRequest(method, path, option).then(
                res => {
                    const ret: Response = {
                        status: res.statusCode!,
                        statusText: res.statusMessage!,
                        contentType: res.headers["content-type"]!.split(";")[0],
                        headers: res.headers,
                        isSuccess: res.statusCode! >= 200 && res.statusCode! <= 202
                    };

                    const chunks: Buffer[] = [];

                    res.on("data", chunk => chunks.push(chunk as Buffer));
                    res.on("end", () => {
                        const buffer = Buffer.concat(chunks);

                        if (ret.contentType === "application/json") {
                            ret.body = JSON.parse(buffer.toString("utf8"));
                        } else if (ret.contentType === "text/plain") {
                            ret.body = buffer.toString("utf8");
                        } else {
                            ret.body = buffer;
                        }

                        if (ret.isSuccess === true) {
                            resolve(ret);
                        } else {
                            reject(ret);
                        }
                    });
                },
                err => {
                    const ret = new ErrorResponse({
                        status: -1,
                        statusText: "Request Failure",
                        contentType: "",
                        headers: {},
                        isSuccess: false,
                        body: err
                    });

                    reject(ret);
                }
            );
        });
    }

    async call(operationId: string, param: { [key: string]: any } = {}, option: RequestOption = {}): Promise<any | IncomingMessage> {
        if (!this._docs) {
            await this._getDocs();
        }

        let path: string;
        let method: RequestMethod;
        let parameters: OpenAPIV2.GeneralParameterObject[];
        let operation: OpenAPIV2.OperationObject;
        for (path in this._docs.paths) {
            const p = this._docs.paths[path] as OpenAPIV2.PathItemObject;
            if (p.post?.operationId === operationId) {
                method = "POST";
                parameters = [...p.parameters!, ...(p.post.parameters || [])] as any;
                operation = p.post;
                break;
            }
            if (p.get?.operationId === operationId) {
                method = "GET";
                parameters = [...p.parameters!, ...(p.get.parameters || [])] as any;
                operation = p.get;
                break;
            }
            if (p.put?.operationId === operationId) {
                method = "PUT";
                parameters = [...p.parameters!, ...(p.put.parameters || [])] as any;
                operation = p.put;
                break;
            }
            if (p.delete?.operationId === operationId) {
                method = "DELETE";
                parameters = [...p.parameters!, ...(p.delete.parameters || [])] as any;
                operation = p.delete;
                break;
            }
        }

        if (!operation!) {
            throw new Error(`operationId "${operationId}" is not found.`);
        }

        option = {
            headers: {},
            query: {},
            ...option
        };

        for (const p of parameters!) {
            if (param[p.name] === undefined || param[p.name] === null) {
                if (p.required) {
                    throw new Error(`Required parameter "${p.name}" is undefined.`);
                }
                continue;
            }
            if (p.in === "path") {
                path = path!.replace(`{${p.name}}`, param[p.name]);
            } else if (p.in === "header") {
                option.headers![p.name] = param[p.name];
            } else if (p.in === "query") {
                option.query![p.name] = param[p.name];
            } else if (p.in === "body" && p.name === "body") {
                option.body = param.body;
            }
        }

        if (operation.tags!.indexOf("stream") !== -1) {
            return this._requestStream(method!, path!, option);
        }
        return this.request(method!, path!, option);
    }

    async getChannels(query?: ChannelsQuery): Promise<Channel[]> {
        const res = await this.call("getChannels", query);
        return res.body as Channel[];
    }

    async getChannelsByType(type: ChannelType, query?: ChannelsQuery): Promise<Channel[]> {
        const res = await this.call("getChannelsByType", { type, ...query });
        return res.body as Channel[];
    }

    async getChannel(type: ChannelType, channel: string): Promise<Channel> {
        const res = await this.call("getChannel", { type, channel });
        return res.body as Channel;
    }

    async getServicesByChannel(type: ChannelType, channel: string): Promise<Service[]> {
        const res = await this.call("getServicesByChannel", { type, channel });
        return res.body as Service[];
    }

    async getServiceByChannel(type: ChannelType, channel: string, sid: ServiceId): Promise<Service> {
        const res = await this.call("getServiceByChannel", { type, channel, sid });
        return res.body as Service;
    }

    async getServiceStreamByChannel(opt: { type: ChannelType; channel: string; sid: ServiceId; decode?: boolean; priority?: number; signal?: AbortSignal }): Promise<IncomingMessage>;
    async getServiceStreamByChannel(type: ChannelType, channel: string, sid: ServiceId, decode?: boolean, priority?: number): Promise<IncomingMessage>;
    async getServiceStreamByChannel(...args: any[]) {
        let type: ChannelType;
        let channel: string;
        let sid: ServiceId;
        let decode: boolean;
        let priority: number;
        let signal: AbortSignal;

        if (typeof args[0] === "object") {
            const opt = args[0];
            type = opt.type;
            channel = opt.channel;
            sid = opt.sid;
            decode = opt.decode;
            priority = opt.priority;
            signal = opt.signal;
        } else {
            type = args[0];
            channel = args[1];
            sid = args[2];
            decode = args[3];
            priority = args[4];
            signal = null as any;
        }

        return this.call(
            "getServiceStreamByChannel",
            {
                type,
                channel,
                sid,
                decode: decode ? 1 : 0
            },
            { priority, signal }
        );
    }

    async getChannelStream(opt: { type: ChannelType; channel: string; decode?: boolean; priority?: number; signal?: AbortSignal }): Promise<IncomingMessage>;
    async getChannelStream(type: ChannelType, channel: string, decode?: boolean, priority?: number): Promise<IncomingMessage>;
    async getChannelStream(...args: any[]): Promise<IncomingMessage> {
        let type: ChannelType;
        let channel: string;
        let decode: boolean;
        let priority: number;
        let signal: AbortSignal;

        if (typeof args[0] === "object") {
            const opt = args[0];
            type = opt.type;
            channel = opt.channel;
            decode = opt.decode;
            priority = opt.priority;
            signal = opt.signal;
        } else {
            type = args[0];
            channel = args[1];
            decode = args[2];
            priority = args[3];
            signal = null as any;
        }

        return this.call(
            "getChannelStream",
            {
                type,
                channel,
                decode: decode ? 1 : 0
            },
            { priority, signal }
        );
    }

    async getPrograms(query?: ProgramsQuery): Promise<Program[]> {
        const res = await this.call("getPrograms", query);
        return res.body as Program[];
    }

    async getProgram(id: ProgramId): Promise<Program> {
        const res = await this.call("getProgram", { id });
        return res.body as Program;
    }

    async getProgramStream(opt: { id: ProgramId; decode?: boolean; priority?: number; signal?: AbortSignal }): Promise<IncomingMessage>;
    async getProgramStream(id: ProgramId, decode?: boolean, priority?: number): Promise<IncomingMessage>;
    async getProgramStream(...args: any[]): Promise<IncomingMessage> {
        let id: ProgramId;
        let decode: boolean;
        let priority: number;
        let signal: AbortSignal;

        if (typeof args[0] === "object") {
            const opt = args[0];
            id = opt.id;
            decode = opt.decode;
            priority = opt.priority;
            signal = opt.signal;
        } else {
            id = args[0];
            decode = args[1];
            priority = args[2];
            signal = null as any;
        }

        return this.call(
            "getProgramStream",
            {
                id,
                decode: decode ? 1 : 0
            },
            { priority, signal }
        );
    }

    async getServices(query?: ServicesQuery): Promise<Service[]> {
        const res = await this.call("getServices", query);
        return res.body as Service[];
    }

    async getService(id: ServiceItemId): Promise<Service> {
        const res = await this.call("getService", { id });
        return res.body as Service;
    }

    async getLogoImage(id: ServiceItemId): Promise<Buffer> {
        const res = await this.call("getLogoImage", { id });
        return res.body as Buffer;
    }

    async getServiceStream(opt: { id: ServiceItemId; decode?: boolean; priority?: number; signal?: AbortSignal }): Promise<IncomingMessage>;
    async getServiceStream(id: ServiceItemId, decode?: boolean, priority?: number): Promise<IncomingMessage>;
    async getServiceStream(...args: any[]): Promise<IncomingMessage> {
        let id: ServiceItemId;
        let decode: boolean;
        let priority: number;
        let signal: AbortSignal;

        if (typeof args[0] === "object") {
            const opt = args[0];
            id = opt.id;
            decode = opt.decode;
            priority = opt.priority;
            signal = opt.signal;
        } else {
            id = args[0];
            decode = args[1];
            priority = args[2];
            signal = null as any;
        }

        return this.call(
            "getServiceStream",
            {
                id,
                decode: decode ? 1 : 0
            },
            { priority, signal }
        );
    }

    async getTuners(): Promise<TunerDevice[]> {
        const res = await this.call("getTuners");
        return res.body as TunerDevice[];
    }

    async getTuner(index: number): Promise<TunerDevice> {
        const res = await this.call("getTuner", { index });
        return res.body as TunerDevice;
    }

    async getTunerProcess(index: number): Promise<TunerProcess> {
        const res = await this.call("getTunerProcess", { index });
        return res.body as TunerProcess;
    }

    async killTunerProcess(index: number): Promise<TunerProcess> {
        const res = await this.call("killTunerProcess", { index });
        return res.body as TunerProcess;
    }

    async getEvents(): Promise<Event[]> {
        const res = await this.call("getEvents");
        return res.body as Event[];
    }

    async getEventsStream(query?: EventsQuery): Promise<IncomingMessage> {
        return this.call("getEventsStream", query);
    }

    async getChannelsConfig(): Promise<ConfigChannels> {
        const res = await this.call("getChannelsConfig");
        return res.body as ConfigChannels;
    }

    async updateChannelsConfig(channels: ConfigChannels): Promise<ConfigChannels> {
        const res = await this.call("updateChannelsConfig", { body: channels });
        return res.body as ConfigChannels;
    }

    async channelScan(option?: ChannelScanOption): Promise<IncomingMessage> {
        return this.call("channelScan", option);
    }

    async getServerConfig(): Promise<ConfigServer> {
        const res = await this.call("getServerConfig");
        return res.body as ConfigServer;
    }

    async updateServerConfig(server: ConfigServer): Promise<ConfigServer> {
        const res = await this.call("updateServerConfig", { body: server });
        return res.body as ConfigServer;
    }

    async getTunersConfig(): Promise<ConfigTuners> {
        const res = await this.call("getTunersConfig");
        return res.body as ConfigTuners;
    }

    async updateTunersConfig(tuners: ConfigTuners): Promise<ConfigTuners> {
        const res = await this.call("updateTunersConfig", { body: tuners });
        return res.body as ConfigTuners;
    }

    async getLog(): Promise<string> {
        const res = await this.call("getLog");
        return res.body as string;
    }

    async getLogStream(): Promise<IncomingMessage> {
        return this.call("getLogStream");
    }

    async checkVersion(): Promise<Version> {
        const res = await this.call("checkVersion");
        return res.body as Version;
    }

    async updateVersion(force?: boolean): Promise<IncomingMessage> {
        return this.call("updateVersion", { force });
    }

    async getStatus(): Promise<Status> {
        const res = await this.call("getStatus");
        return res.body as Status;
    }

    private _httpRequest(method: RequestMethod, path: string, option: RequestOption = {}): Promise<IncomingMessage> {
        const opt: RequestOptions = {
            method: method,
            path: this.basePath + path,
            headers: option.headers ?? {},
            agent: this.agent
        };

        if (this.host === "") {
            opt.socketPath = this.socketPath;
        } else {
            opt.host = this.host;
            opt.port = this.port;
        }

        // tslint:disable-next-line:prefer-conditional-expression
        if (this.userAgent === "") {
            opt.headers!["User-Agent"] = this._userAgent;
        } else {
            opt.headers!["User-Agent"] = this.userAgent + " " + this._userAgent;
        }

        if (opt.headers!["X-Mirakurun-Priority"] === undefined) {
            if (option.priority === undefined) {
                option.priority = this.priority;
            }
            opt.headers!["X-Mirakurun-Priority"] = option.priority.toString(10);
        }

        if (typeof option.query === "object") {
            opt.path += "?" + stringify(option.query);
        }

        if (typeof option.body === "object") {
            opt.headers!["Content-Type"] = "application/json; charset=utf-8";
            option.body = JSON.stringify(option.body);
        }

        if (option.signal) {
            // instanceof AbortSignal
            // http.request() AbortSignal is not working expectedly on node@16.12.0
            (<any>opt).signal = option.signal;
        }

        return new Promise((resolve, reject) => {
            const req = request(opt, res => {
                if (res.statusCode! > 300 && res.statusCode! < 400 && res.headers.location) {
                    if (/^\//.test(res.headers.location) === false) {
                        reject(new Error(`Redirecting location "${res.headers.location}" isn't supported.`));
                        return;
                    }
                    this._httpRequest(method, res.headers.location, option).then(resolve, reject);
                    return;
                }

                resolve(res);
            });

            if (option.signal) {
                // instanceof AbortSignal
                // workaround
                option.signal.addEventListener(
                    "abort",
                    () => {
                        if (!req.destroyed) {
                            req.destroy();
                        }
                    },
                    { once: true }
                );
            }

            req.on("error", reject);

            // write request body
            if (typeof option.body === "string") {
                req.write(option.body + "\n");
            }
            req.end();
        });
    }

    private async _requestStream(method: RequestMethod, path: string, option: RequestOption = {}): Promise<IncomingMessage> {
        const res = await this._httpRequest(method, path, option);

        if (res.statusCode! >= 200 && res.statusCode! <= 202) {
            return res;
        } else {
            if (res.statusCode) {
                throw new Error(`Bad status respond (${res.statusCode} ${res.statusMessage}).`);
            }
            throw res;
        }
    }

    private async _getDocs() {
        const res = await this.request("GET", this.docsPath);
        if (res.isSuccess !== true) {
            throw new Error(`Failed to get "${this.docsPath}".`);
        }
        this._docs = res.body;
    }
}
