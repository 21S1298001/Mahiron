/*
   Copyright 2017 kanreisa
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
import { spawn } from "child_process";
import { Operation } from "express-openapi";
import * as api from "../api";

export const put: Operation = (req, res) => {
    if (process.env.pm_uptime) {
        const cmd = spawn("mahiron", ["restart"], {
            detached: true,
            stdio: "ignore"
        });
        cmd.unref();

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(202);
        res.end(JSON.stringify({ _cmd_pid: cmd.pid }));
    } else if (process.env.USING_WINSER) {
        const cmd = spawn("cmd", ["/c", "net stop mahiron & sc start mahiron"], {
            detached: true,
            stdio: "ignore"
        });
        cmd.unref();

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(202);
        res.end(JSON.stringify({ _cmd_pid: cmd.pid }));
    } else if (process.env.DOCKER === "YES") {
        res.status(202);
        res.end(JSON.stringify({ _exit: 0 }));
        setTimeout(() => process.kill(parseInt(process.env.INIT_PID, 10), 1), 0);
    } else {
        api.responseError(res, 500);
    }
};

put.apiDoc = {
    tags: ["misc"],
    summary: "Restart Mahiron",
    operationId: "restart",
    produces: ["application/json"],
    responses: {
        202: {
            description: "Accepted"
        },
        default: {
            description: "Unexpected Error",
            schema: {
                $ref: "#/definitions/Error"
            }
        }
    }
};
