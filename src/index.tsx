import { ActionPanel, Action, List, open, getPreferenceValues, closeMainWindow, PopToRootType } from "@raycast/api";
import { readdir } from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import { runAppleScript, useFrecencySorting, usePromise } from "@raycast/utils";
import { z } from "zod";
import * as childProcess from "child_process";
import util from "util";

const exec = util.promisify(childProcess.exec);

const Prefs = z.object({
  projectFolder: z.string(),
});
const { projectFolder } = Prefs.parse(getPreferenceValues());

type Project = {
  id: string;
  name: string;
  value: string;
  description: string;
};

const wezterm = "/opt/homebrew/bin/wezterm";

const waitForWeztermToBeOpen = async () => {
  const isWeztermOpen = async () => {
    const r = await exec(`${wezterm} cli list --format json`);
    const result = JSON.parse(r.stdout);
    console.log(result);
    return result?.[0]?.pane_id ?? null;
  };
  const startTime = Date.now();
  const endTime = startTime + 10000;
  while (Date.now() < endTime) {
    const paneId = await isWeztermOpen();
    if (paneId != null) return paneId;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
};

const openWeztermTab = async (dir: string, tabName: string, command?: string) => {
  const currentPaneId = await waitForWeztermToBeOpen();
  if (currentPaneId == null) {
    console.error("Wezterm is not open, unable to open tab");
    return;
  }

  const r = await exec(`${wezterm} cli spawn --pane-id=${currentPaneId} --cwd "${dir}"`);
  const paneId = Number(r.stdout);
  await exec(`${wezterm} cli set-tab-title --pane-id ${paneId} "${tabName}"`);
  if (command) await exec(`${wezterm} cli send-text --pane-id ${paneId} "${command}\n" --no-paste`);
};

const runProject = async (dir: string) => {
  const activate = (app: string) =>
    runAppleScript(`
      tell application "${app}"
        activate
      end tell
    `);

  // Doing this serially makes it more consistent what gets focused
  await open(dir, "com.sublimemerge");
  await activate("WezTerm");
  await openWeztermTab(dir, path.basename(dir));
  // await open(dir, "com.microsoft.VSCode");
  await open(dir, "dev.zed.Zed");
  // await openWeztermTab(dir, `${path.basename(dir)} helix`, "hx .");
};

const getProjectsFromDir = async (dir: string): Promise<Project[]> => {
  const projectPaths = await readdir(dir);
  return projectPaths
    .filter((projectPath) => fs.statSync(path.join(dir, projectPath)).isDirectory())
    .map((projectPath) => {
      const fullPath = path.join(dir, projectPath);
      return {
        name: projectPath,
        id: fullPath,
        value: fullPath,
        description: fullPath,
      };
    });
};

export default function Command() {
  const { data, isLoading } = usePromise(() => getProjectsFromDir(projectFolder));
  const { data: sortedData, visitItem } = useFrecencySorting(data ?? []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects">
      <List.Section title="Projects" subtitle={data?.length + ""}>
        {sortedData?.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            keywords={item.description.split("/")}
            icon="🚀"
            subtitle={item.description}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Open Project"
                    onAction={async () => {
                      await visitItem(item);
                      await runProject(item.value);
                      closeMainWindow({ popToRootType: PopToRootType.Immediate });
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
