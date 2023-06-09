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
import sift from "sift";
import { Service as IService } from "../../../api.js";
import { responseJSON } from "../api.js";
import { ChannelTypes } from "../common.js";
import { Service } from "../Service.js";
import { _ } from "../_.js";

export const get: Operation = async (req, res) => {
    const serviceItems = [..._.service.items]; // shallow copy
    serviceItems.sort((a, b) => a.getOrder() - b.getOrder());

    const services: IService[] = [];

    for (const serviceItem of serviceItems.filter(sift.default(req.query))) {
        services.push({
            ...serviceItem.export(),
            hasLogoData: await Service.isLogoDataExists(serviceItem.networkId, serviceItem.logoId)
        });
    }

    responseJSON(res, services);
};

get.apiDoc = {
    tags: ["services"],
    operationId: "getServices",
    parameters: [
        {
            in: "query",
            name: "serviceId",
            type: "integer",
            required: false
        },
        {
            in: "query",
            name: "networkId",
            type: "integer",
            required: false
        },
        {
            in: "query",
            name: "name",
            type: "string",
            required: false
        },
        {
            in: "query",
            name: "type",
            type: "integer",
            required: false
        },
        {
            in: "query",
            name: "channel.type",
            type: "string",
            enum: Object.keys(ChannelTypes),
            required: false
        },
        {
            in: "query",
            name: "channel.channel",
            type: "string",
            required: false
        }
    ],
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
