import { launchCommand, LaunchType } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { z } from "zod";

const Numeric = z.coerce.number();

export default async function arrange() {
  const count = await runAppleScript(`
    set d to 0
    tell application "System Events"
      set d to count of desktops
    end tell
    return d
  `).then(Numeric.parse);

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

  const isOnLeftDisplay = async (process: string) => {
    const [xPos] = await runAppleScript(`
          tell application "System Events"
            tell process "${process}"
              return value of attribute "AXPosition" of window 1
            end tell
          end tell
        `).then((res) => res.split(",").map((num) => Numeric.parse(num)));
    return xPos < 0;
  };

  const moveWindow = async (
    app: string,
    process: string,
    singleMonitorCommands: string[],
    multiMonitorCommands: string[],
  ) => {
    const numDesktops = await count;
    await activate(app);
    const commands = numDesktops === 1 ? singleMonitorCommands : multiMonitorCommands;
    for (const command of commands) {
      if (command === "previous-display" && (await isOnLeftDisplay(process))) continue;
      if (command === "next-display" && !(await isOnLeftDisplay(process))) continue;
      await new Promise((resolve) => setTimeout(resolve, 100));
      await windowCommand(command);
    }
  };

  await moveWindow("Sublime Merge", "Sublime Merge", ["left-half"], ["previous-display", "maximize"]);
  await moveWindow("Warp", "Warp", ["right-half"], ["next-display", "first-fourth"]);
  await moveWindow("Arc", "Arc", ["right-half"], ["next-display", "last-fourth"]);
  await moveWindow("Visual Studio Code", "Code", ["left-half"], ["next-display", "center-half"]);
}
