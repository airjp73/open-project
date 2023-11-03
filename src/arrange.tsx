import { launchCommand, LaunchType } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { z } from "zod";

const Numeric = z.coerce.number();

export default async function arrange() {
  const numDesktops = await runAppleScript(`
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

  type WindowMoveArgs = {
    app: string;
    process: string;
    singleMonitorCommand: string;
    multiMonitorCommand: string;
    monitor: "left" | "right";
  };

  const forEachWindow = async (process: string, callback: () => Promise<void>) => {
    let windowNum = 1;
    let hasNext = true;
    while (hasNext) {
      const exists = await runAppleScript(`
        tell application "System Events"
          tell process "${process}"
            perform action "AXRaise" of window ${windowNum}
            return exists window ${windowNum + 1}
          end tell
        end tell
      `);
      hasNext = exists === "true";
      windowNum++;
      await callback();
    }
  };

  const moveWindow = async ({ app, process, singleMonitorCommand, multiMonitorCommand, monitor }: WindowMoveArgs) => {
    const command = numDesktops === 1 ? singleMonitorCommand : multiMonitorCommand;
    await activate(app);
    await forEachWindow(process, async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (numDesktops > 1) {
        const isLeft = await isOnLeftDisplay(process);
        if ((monitor === "right" && !isLeft) || (monitor === "left" && isLeft)) return;
        await windowCommand(monitor === "right" ? "next-display" : "previous-display");
      }
      await windowCommand(command);
    });
  };

  await moveWindow({
    app: "Sublime Merge",
    process: "Sublime Merge",
    singleMonitorCommand: "left-half",
    multiMonitorCommand: "maximize",
    monitor: "left",
  });
  await moveWindow({
    app: "Warp",
    process: "Warp",
    singleMonitorCommand: "right-half",
    multiMonitorCommand: "first-fourth",
    monitor: "right",
  });
  await moveWindow({
    app: "Arc",
    process: "Arc",
    singleMonitorCommand: "right-half",
    multiMonitorCommand: "last-fourth",
    monitor: "right",
  });
  await moveWindow({
    app: "Visual Studio Code",
    process: "Code",
    singleMonitorCommand: "left-half",
    multiMonitorCommand: "center-half",
    monitor: "right",
  });
}
