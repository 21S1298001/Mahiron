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
import cors, { CorsOptions } from "cors";
import express, { json, NextFunction, Request, Response, static as expressStatic, urlencoded } from "express";
import { initialize } from "express-openapi";
import { chmod, readFile, unlink } from "fs/promises";
import { createServer, Server as HttpServer } from "http";
import { load } from "js-yaml";
import { Server as RPCServer } from "jsonrpc2-ws";
import morgan from "morgan";
import { OpenAPIV2 } from "openapi-types";
import { sleep } from "./common.js";
import { exists } from "./fs.js";
import { log } from "./log.js";
import { regexp } from "./regexp.js";
import { createRPCServer, initRPCNotifier } from "./rpc.js";
import { getIPv4AddressesForListen, getIPv6AddressesForListen, isPermittedHost, isPermittedIPAddress } from "./system.js";
import { _ } from "./_.js";

const pkg = JSON.parse(await readFile("./package.json", { encoding: "utf-8" }));

export class Server {
    private _isRunning = false;
    private _servers = new Set<HttpServer>();
    private _rpcs = new Set<RPCServer>();

    async init() {
        if (this._isRunning === true) {
            throw new Error("Server is running");
        }
        this._isRunning = true;

        const serverConfig = _.config.server!;

        let addresses: string[] = [];

        if (serverConfig.path) {
            addresses.push(serverConfig.path);
        }

        if (serverConfig.port) {
            while (true) {
                try {
                    if (getIPv4AddressesForListen().length > 0) {
                        break;
                    }
                } catch (e) {
                    console.error(e);
                }
                log.warn("Server hasn't detected IPv4 addresses...");
                await sleep(5000);
            }

            addresses = [...addresses, ...getIPv4AddressesForListen(), "127.0.0.1"];

            if (serverConfig.disableIPv6 !== true) {
                addresses = [...addresses, ...getIPv6AddressesForListen(), "::1"];
            }
        }

        const app = express();

        app.disable("x-powered-by");
        app.disable("etag");

        const corsOptions: CorsOptions = {
            origin: (origin, callback) => {
                if (!origin) {
                    return callback(null, true);
                }
                if (isPermittedHost(origin, serverConfig.hostname)) {
                    return callback(null, true);
                }
                return callback(new Error("Not allowed by CORS"));
            }
        };
        app.use(cors(corsOptions));

        app.use(
            morgan(":remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms :user-agent", {
                stream: log as any
            })
        );
        app.use(urlencoded({ extended: false }));
        app.use(json());

        app.use((req: Request, res: Response, next: NextFunction) => {
            if (req.ip && isPermittedIPAddress(req.ip) === false) {
                req.socket.end();
                return;
            }

            if (req.get("Origin") !== undefined) {
                if (!isPermittedHost(req.get("Origin") ?? "", serverConfig.hostname)) {
                    res.status(403).end();
                    return;
                }
            }

            if (req.get("Referer") !== undefined) {
                if (!isPermittedHost(req.get("Referer") ?? "", serverConfig.hostname)) {
                    res.status(403).end();
                    return;
                }
            }

            res.setHeader("Server", "Mahiron/" + pkg.version);
            next();
        });

        if (!serverConfig.disableWebUI) {
            app.use(
                expressStatic("lib/ui", {
                    setHeaders: (res, path) => {
                        if (expressStatic.mime.lookup(path) === "image/svg+xml") {
                            res.setHeader("Cache-Control", "public, max-age=86400");
                        }
                    }
                })
            );
            app.use("/swagger-ui", expressStatic("node_modules/swagger-ui-dist"));
            app.use("/api/debug", expressStatic("lib/ui/swagger-ui.html"));
        }

        const api = load(await readFile("api.yml", { encoding: "utf8" })) as OpenAPIV2.Document;
        api.info.version = pkg.version;

        initialize({
            app: app,
            apiDoc: api,
            docsPath: "/docs",
            paths: "./lib/Mirakurun/api"
        });

        app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
            if (err.message === "Not allowed by CORS") {
                res.status(403).end();
                return;
            }

            log.error(JSON.stringify(err, null, "  "));
            console.error(err.stack);

            if (res.headersSent === false) {
                res.writeHead(err.status || 500, {
                    "Content-Type": "application/json"
                });
            }

            res.end(
                JSON.stringify({
                    code: res.statusCode,
                    reason: err.message || res.statusMessage,
                    errors: err.errors
                })
            );

            next();
        });

        for (const address of addresses) {
            const server = createServer(app);

            server.timeout = 1000 * 15; // 15 sec.

            if (regexp.unixDomainSocket.test(address) === true || regexp.windowsNamedPipe.test(address) === true) {
                if (process.platform !== "win32" && (await exists(address))) {
                    await unlink(address);
                }

                server.listen(address, () => {
                    log.info("listening on http+unix://%s", address.replace(/\//g, "%2F"));
                });

                if (process.platform !== "win32") {
                    await chmod(address, "777");
                }
            } else {
                server.listen(serverConfig.port, address, () => {
                    if (address.includes(":") === true) {
                        const [addr, iface] = address.split("%");
                        log.info("listening on http://[%s]:%d (%s)", addr, serverConfig.port, iface);
                    } else {
                        log.info("listening on http://%s:%d", address, serverConfig.port);
                    }
                });
            }

            this._servers.add(server);
            this._rpcs.add(createRPCServer(server));
        }

        // event notifications for RPC
        initRPCNotifier(this._rpcs);

        log.info("RPC interface is enabled");
    }
}
