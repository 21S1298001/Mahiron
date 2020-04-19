/*
   Copyright 2016 kanreisa

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
import * as api from "../../../../../api";
import Channel from "../../../../../Channel";
import Service from "../../../../../Service";
import { ChannelTypes, ChannelType } from "../../../../../common";

export const parameters = [
    {
        in: "path",
        name: "type",
        type: "string",
        enum: Object.keys(ChannelTypes),
        required: true
    },
    {
        in: "path",
        name: "channel",
        type: "string",
        required: true
    },
    {
        in: "path",
        name: "id",
        type: "integer",
        maximum: 6553565535,
        required: true
    }
];

export const get: Operation = (req, res) => {

    const channel = Channel.get(req.params.type as ChannelType, req.params.channel);

    if (channel === null) {
        api.responseError(res, 404);
        return;
    }

    const reqId = req.params.id as any as number;
    const service = Service.findByChannel(channel).find(sv => (sv.id === reqId || sv.serviceId === reqId));

    if (!service) {
        api.responseError(res, 404);
        return;
    }

    res.redirect(307, `/api/services/${service.id}`);
};

get.apiDoc = {
    tags: ["channels", "services"],
    operationId: "getServiceByChannel",
    responses: {
        200: {
            description: "OK",
            schema: {
                type: "array",
                items: {
                    $ref: "#/definitions/Service"
                }
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
