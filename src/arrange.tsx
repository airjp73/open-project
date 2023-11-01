import { launchCommand, LaunchType } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { z } from "zod";

export default async function arrange() {
  const count = await runAppleScript(`
    set d to 0
    tell application "System Events"
      set d to count of desktops
    end tell
    return d
  `).then((res) => {
    return z.coerce.number().parse(res);
  });

  const activate = (app: string) =>
    runAppleScript(`
      tell application "${app}"
        activate
      end tell
    `);

  const windowCommand = (command: string) =>
    launchCommand({
      extensionName: "window-management",
      name: command,
      ownerOrAuthorName: "raycast",
      type: LaunchType.UserInitiated,
    });

  const moveWindow = async (app: string, singleMonitorCommands: string[], multiMonitorCommands: string[]) => {
    const numDesktops = await count;
    await activate(app);
    const commands = numDesktops === 1 ? singleMonitorCommands : multiMonitorCommands;
    for (const command of commands) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await windowCommand(command);
    }
  };

  await moveWindow("Sublime Merge", ["left-half"], ["previous-desktop", "maximize"]);
  await moveWindow("Warp", ["right-half"], ["first-fourth"]);
  await moveWindow("Visual Studio Code", ["left-half"], ["center-half"]);
  await moveWindow("Arc", ["right-half"], ["first-fourth"]);
}
