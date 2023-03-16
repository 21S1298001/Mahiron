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
import { ActionButton, ColorClassNames, createTheme, Fabric, Link, loadTheme, Pivot, PivotItem, Separator, Stack, Text } from "@fluentui/react";
import { initializeIcons } from "@fluentui/react/lib/Icons";
import EventEmitter from "eventemitter3";
import { Client as RPCClient } from "jsonrpc2-ws";
import * as React from "react";
import { useEffect, useState } from "react";
import * as ReactDOM from "react-dom";
import { Service, Status, TunerDevice } from "../../api.d";
import { EventMessage } from "../../lib/Mirakurun/Event.d";
import { JoinParams, NotifyParams } from "../../lib/Mirakurun/rpc.d";
import { ConfigView } from "./components/ConfigView";
import { ConnectionGuide } from "./components/ConnectionGuide";
import { EventsView } from "./components/EventsView";
import { LogsView } from "./components/LogsView";
import { Restart } from "./components/Restart";
import { StatusView } from "./components/StatusView";
import "./index.css";

initializeIcons();

export type UIState = {
    version: string;
    statusName: string;
    statusIconName: string;
    tuners: TunerDevice[];
    services: Service[];
    status: Status | null;
};

const uiState: UIState = {
    version: "..",
    statusName: "Loading",
    statusIconName: "offline",
    tuners: [],
    services: [],
    status: null
};

const uiStateEvents = new EventEmitter();

const iconSrcMap = {
    normal: "icon.svg",
    offline: "icon-gray.svg",
    active: "icon-active.svg"
};

let statusRefreshInterval: any;
let servicesRefreshInterval: any;

function idleStatusChecker(): boolean {
    let statusName = "Standby";
    let statusIconName = "normal";

    const isActive = uiState.tuners.some(tuner => tuner.isUsing === true && tuner.users.some(user => user.priority !== -1));
    if (isActive) {
        statusName = "Active";
        statusIconName = "active";
    }

    if (uiState.statusName === statusName) {
        return false;
    }

    uiState.statusName = statusName;
    uiState.statusIconName = statusIconName;
    uiStateEvents.emit("update");

    return true;
}
uiStateEvents.on("update:tuners", idleStatusChecker);

const rpc = new RPCClient(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/rpc`, { protocols: null as any });

rpc.on("connecting", () => {
    console.log("rpc:connecting");

    uiState.statusName = "Connecting";
    uiStateEvents.emit("update");
});

rpc.on("connected", async () => {
    console.log("rpc:connected");

    // status
    {
        uiState.status = await rpc.call("getStatus");

        statusRefreshInterval = setInterval(async () => {
            if (document.hidden) {
                return;
            }
            uiState.status = await rpc.call("getStatus");
            uiStateEvents.emit("update:status");
        }, 1000 * 3);

        if (uiState.version !== ".." && uiState.version !== uiState.status?.version) {
            location.reload();
            return;
        }
        uiState.version = uiState.status?.version ?? "";
    }

    // services
    {
        uiState.services = await (await fetch("/api/services")).json();

        servicesRefreshInterval = setInterval(async () => {
            if (document.hidden) {
                return;
            }
            uiState.services = await (await fetch("/api/services")).json();
            uiStateEvents.emit("update:services");
        }, 1000 * 60);
    }
    uiState.tuners = await (await fetch("/api/tuners")).json();

    await rpc.call("join", {
        rooms: ["events:tuner", "events:service"]
    } as JoinParams);

    uiStateEvents.emit("update");
    uiStateEvents.emit("update:status");
    uiStateEvents.emit("update:services");
    uiStateEvents.emit("update:tuners");
});

rpc.on("disconnect", () => {
    console.log("rpc:disconnected");

    clearInterval(statusRefreshInterval);
    clearInterval(servicesRefreshInterval);

    uiState.statusName = "Disconnected";
    uiState.statusIconName = "offline";
    uiStateEvents.emit("update");
});

rpc.methods.set("events", async (socket, { array }: NotifyParams<EventMessage>) => {
    let reloadServiceRequired = false;

    for (const event of array) {
        if (event.resource === "service") {
            const service: Service = event.data;
            reloadServiceRequired = true;

            for (const _service of uiState.services) {
                if (_service.id === service.id) {
                    Object.assign(_service, service);
                    uiStateEvents.emit("update:services");
                    reloadServiceRequired = false;
                    break;
                }
            }
        } else if (event.resource === "tuner") {
            const tuner: TunerDevice = event.data;

            uiState.tuners[uiState.tuners.findIndex(value => value.index === tuner.index)] = tuner;
            uiStateEvents.emit("update:tuners");
        }
    }

    if (reloadServiceRequired) {
        uiState.services = await (await fetch("/api/services")).json();
        uiStateEvents.emit("update:services");
    }

    uiStateEvents.emit("data:events", array);
});

rpc.methods.set("logs", (socket, { array }: NotifyParams<string>) => {
    uiStateEvents.emit("data:logs", array);
});

const Content = () => {
    const [state, setState] = useState<UIState>(uiState);

    useEffect(() => {
        const title = `${state.statusName} - Mirakurun ${state.version}`;
        if (document.title !== title) {
            document.title = title;
        }

        const icon = document.getElementById("icon");
        if (!icon) return;
        if (icon.getAttribute("href") !== iconSrcMap[state.statusIconName as keyof typeof iconSrcMap]) {
            icon.setAttribute("href", iconSrcMap[state.statusIconName as keyof typeof iconSrcMap]);
        }

        const onStateUpdate = () => {
            setState({ ...uiState });
        };
        uiStateEvents.on("update", onStateUpdate);

        return () => {
            uiStateEvents.removeListener("update", onStateUpdate);
        };
    });

    return (
        <Fabric style={{ margin: "16px" }}>
            <Stack tokens={{ childrenGap: "8 0" }}>
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: "0 8" }}>
                    <img style={{ height: "96px" }} src={iconSrcMap[state.statusIconName as keyof typeof iconSrcMap]} />
                    <div className="ms-fontSize-42">Mahiron</div>
                    <Text variant="mediumPlus" nowrap block className={ColorClassNames.themePrimary}>
                        {state.status?.version}
                    </Text>
                    <Text variant="medium" nowrap block className={ColorClassNames.neutralTertiaryAlt}>
                        ({state.statusName})
                    </Text>
                    <Stack.Item grow disableShrink>
                        &nbsp;
                    </Stack.Item>
                    <ConnectionGuide />
                    <ActionButton iconProps={{ iconName: "KnowledgeArticle" }} text="API Docs" target="_blank" href="/api/debug" />
                    <Restart uiStateEvents={uiStateEvents} />
                </Stack>

                <Pivot>
                    <PivotItem itemIcon="GroupedList" headerText="Status">
                        <StatusView uiState={uiState} uiStateEvents={uiStateEvents} />
                    </PivotItem>
                    <PivotItem itemIcon="EntitlementRedemption" headerText="Events">
                        <EventsView uiStateEvents={uiStateEvents} rpc={rpc} />
                    </PivotItem>
                    <PivotItem itemIcon="ComplianceAudit" headerText="Logs">
                        <LogsView uiStateEvents={uiStateEvents} rpc={rpc} />
                    </PivotItem>
                    <PivotItem itemIcon="Settings" headerText="Config">
                        <ConfigView uiState={uiState} uiStateEvents={uiStateEvents} />
                    </PivotItem>
                </Pivot>

                <Stack>
                    <Separator />
                    <Text>
                        <Link href="https://github.com/21S1298001/Mahiron" target="_blank">
                            Mahiron
                        </Link>{" "}
                        {state.version}
                        &nbsp;&copy; 2023{" "}
                        <Link href="https://github.com/21S1298001" target="_blank">
                            21S1298001
                        </Link>
                        , Forked from{" "}
                        <Link href="https://chinachu.moe/" target="_blank">
                            Chinachu
                        </Link>
                        /
                        <Link href="https://github.com/Chinachu/Mirakurun" target="_blank">
                            Mirakurun
                        </Link>
                        &nbsp;&copy; 2016-{" "}
                        <Link href="https://github.com/kanreisa" target="_blank">
                            kanreisa
                        </Link>
                    </Text>
                </Stack>

                <Stack>
                    <Text variant="xSmall" className={ColorClassNames.neutralTertiaryAlt}>
                        Mahiron comes with ABSOLUTELY NO WARRANTY. USE AT YOUR OWN RISK.
                    </Text>
                </Stack>
            </Stack>
        </Fabric>
    );
};

ReactDOM.render(<Content />, document.getElementById("root"));

// dark theme
const myTheme = createTheme({
    palette: {
        themePrimary: "#ffd56c",
        themeLighterAlt: "#0a0904",
        themeLighter: "#292211",
        themeLight: "#4d4020",
        themeTertiary: "#998040",
        themeSecondary: "#e0bc5e",
        themeDarkAlt: "#ffd97a",
        themeDark: "#ffdf8f",
        themeDarker: "#ffe8ac",
        neutralLighterAlt: "#2d2f37",
        neutralLighter: "#34363f",
        neutralLight: "#40424c",
        neutralQuaternaryAlt: "#474a54",
        neutralQuaternary: "#4e505b",
        neutralTertiaryAlt: "#686b77",
        neutralTertiary: "#f1f1f1",
        neutralSecondary: "#f4f4f4",
        neutralPrimaryAlt: "#f6f6f6",
        neutralPrimary: "#ebebeb",
        neutralDark: "#fafafa",
        black: "#fdfdfd",
        white: "#25272e"
    }
});
loadTheme(myTheme);
