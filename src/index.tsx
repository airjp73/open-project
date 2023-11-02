import { ActionPanel, Action, List, open, getPreferenceValues, closeMainWindow, PopToRootType } from "@raycast/api";
import { readdir } from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import { runAppleScript, useFrecencySorting, usePromise } from "@raycast/utils";
import { z } from "zod";

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

const runProject = async (dir: string) => {
  const activate = (app: string) =>
    runAppleScript(`
      tell application "${app}"
        activate
      end tell
    `);
  await Promise.all([
    open(dir, "com.microsoft.VSCode"),
    open(dir, "com.sublimemerge"),
    open(dir, "dev.warp.Warp-Stable"),
    activate("Arc"),
  ]);
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
