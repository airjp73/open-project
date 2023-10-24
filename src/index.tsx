import { ActionPanel, Action, List, open } from "@raycast/api";
import * as os from "os";
import { readdir } from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import { useFrecencySorting, usePromise } from "@raycast/utils";

const excludeFiles = /node_modules/;
const home = os.homedir();
const folders = [`${home}/dev`, `${home}/dev/raycast`];

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
    .filter((projectPath) => !excludeFiles.test(projectPath))
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
    const projects = await Promise.all(folders.map(getProjectsFromDir));
    return projects.flat();
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
