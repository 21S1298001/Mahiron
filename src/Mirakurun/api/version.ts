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
import { readFile } from "fs/promises";
import { Version } from "../../../api.js";
import { responseJSON } from "../api.js";

const pkg = JSON.parse(await readFile("./package.json", { encoding: "utf-8" }));

export const get: Operation = async (_req, res) => {
    const version: Version = {
        current: pkg.version,
        latest: "",
        server: "mahiron"
    };

    responseJSON(res, version);
};

get.apiDoc = {
    tags: ["version"],
    operationId: "checkVersion",
    responses: {
        200: {
            description: "OK",
            schema: {
                $ref: "#/definitions/Version"
            }
        },
        default: {
            description: "Unexpected Error",
            schema: {
                $ref: "#/definitions/Error"
            }
        }
    }
};
