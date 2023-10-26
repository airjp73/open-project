import { ActionPanel, Action, List, open, getPreferenceValues, popToRoot } from "@raycast/api";
import { readdir } from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import { useFrecencySorting, usePromise } from "@raycast/utils";
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
  open(dir, "com.microsoft.VSCode");
  open(dir, "com.sublimemerge");
  open(dir, "dev.warp.Warp-Stable");
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
  const { data, isLoading } = usePromise(async () => {
    return getProjectsFromDir(projectFolder);
  });
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
                      popToRoot();
                      runProject(item.value);
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
