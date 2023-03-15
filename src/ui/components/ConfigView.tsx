/*
   Copyright 2020 kanreisa
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
import { Nav, Stack } from "@fluentui/react";
import EventEmitter from "eventemitter3";
import React, { useState } from "react";
import { UIState } from "../index";
import { ChannelsConfigurator } from "./ChannelsConfigurator";
import { ServerConfigurator } from "./ServerConfigurator";
import { TunersConfigurator } from "./TunersConfigurator";

export type ConfiViewProps = Readonly<{ uiState: UIState; uiStateEvents: EventEmitter }>;

export const ConfigView: React.FC<ConfiViewProps> = ({ uiState, uiStateEvents }) => {
    const [key, setKey] = useState<string>("server");

    return (
        <Stack horizontal tokens={{ childrenGap: "0 8" }} style={{ margin: "8px 0" }}>
            <Nav
                groups={[
                    {
                        links: [
                            {
                                key: "server",
                                name: "Server",
                                url: "",
                                onClick: () => setKey("server")
                            },
                            {
                                key: "tuners",
                                name: "Tuners",
                                url: "",
                                onClick: () => setKey("tuners")
                            },
                            {
                                key: "channels",
                                name: "Channels",
                                url: "",
                                onClick: () => setKey("channels")
                            }
                        ]
                    }
                ]}
                selectedKey={key}
                styles={{ root: { width: 150 } }}
            />
            <Stack.Item grow>
                <div style={{ margin: "8px 0 8px 24px" }}>
                    {key === "server" && <ServerConfigurator uiState={uiState} uiStateEvents={uiStateEvents} />}
                    {key === "tuners" && <TunersConfigurator uiState={uiState} uiStateEvents={uiStateEvents} />}
                    {key === "channels" && <ChannelsConfigurator uiState={uiState} uiStateEvents={uiStateEvents} />}
                </div>
            </Stack.Item>
        </Stack>
    );
};
