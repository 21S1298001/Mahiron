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
import { Operation } from "express-openapi";
import { readFile } from "fs/promises";
import { responseJSON } from "../../api.js";
import { _ } from "../../_.js";

const pkg = JSON.parse(await readFile("./package.json", { encoding: "utf-8" }));

export const get: Operation = (req, res) => {
    const apiRoot = `${req.protocol}://${req.headers.host}/api`;

    responseJSON(res, {
        FriendlyName: `Mahiron`,
        ModelNumber: `MAHIRON`,
        FirmwareName: `mahiron_${process.arch}_${process.platform}`,
        FirmwareVersion: pkg.version,
        Manufacturer: "21S1298001",
        DeviceID: req.headers.host.replace(/[\[\].:]/g, ""),
        DeviceAuth: "MAHIRON",
        TunerCount: _.tuner.devices.length,
        BaseURL: `${apiRoot}/iptv`,
        LineupURL: `${apiRoot}/iptv/lineup.json`
    });
};

get.apiDoc = {
    tags: ["iptv"],
    summary: "IPTV - Media Server Support",
    responses: {
        200: {
            description: "OK"
        },
        default: {
            description: "Unexpected Error",
            schema: {
                $ref: "#/definitions/Error"
            }
        }
    }
};
