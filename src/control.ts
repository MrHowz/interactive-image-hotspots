import OBR from "@owlbear-rodeo/sdk";
import {
  CONTROL,
  requestControl,
  type ControlCommand,
  type ControlPort,
} from "./controlProtocol";
import type { Selection } from "./model";
export const localControl: ControlPort = {
  subscribe: (callback) =>
    OBR.broadcast.onMessage(CONTROL, (event) => callback(event.data)),
  send: (data) =>
    OBR.broadcast.sendMessage(CONTROL, data, { destination: "LOCAL" }),
};
export const control = (command: ControlCommand, selection?: Selection) =>
  requestControl(localControl, command, selection);
