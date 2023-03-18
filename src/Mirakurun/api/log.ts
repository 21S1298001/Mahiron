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
import { Operation } from "express-openapi";
import { log } from "../log.js";

export const get: Operation = (_req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200);

    const logs = log.logs;
    const len = logs.length;
    for (let i = 0; i < len; i++) {
        res.write(logs[i] + "\n");
    }

    res.end();
};

get.apiDoc = {
    tags: ["log"],
    operationId: "getLog",
    produces: ["text/plain"],
    responses: {
        200: {
            description: "OK"
        },
        default: {
            description: "Unexpected Error"
        }
    }
};
