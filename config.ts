import path from 'path';

export type PresetGroup = {
  id: string;
  presetFile: string;
  presetName?: string;
  maxInstances: number;
};

export type Config = {
  inputDir: string;
  handBrakeCLI: string;
  presetGroups: PresetGroup[];
  defaultPresetGroupId: string;
  excludedDirs: string[];
  videoExtensions: string[];
  outputSuffix: string;
  outputExtension: string;
  deleteSource: boolean;
  queueStateFile?: string;
};

const projectRoot = process.cwd();

export const config: Config = {
  inputDir: "/home/sam/Videos/Tests/Original",
  handBrakeCLI: 'HandBrakeCLI',
  presetGroups: [
    {
      id: 'nvenc',
      presetFile: path.resolve(projectRoot, 'presets', 'nvenc.json'),
      maxInstances: 1
    },
    {
      id: 'cpu',
      presetFile: path.resolve(projectRoot, 'presets', 'cpu.json'),
      maxInstances: 2
    }
  ],
  defaultPresetGroupId: 'cpu',
  excludedDirs: ['/mnt/plexdrive/temp', '/mnt/plexdrive/MC'],
  videoExtensions: ['.mp4', '.avi', '.mov', '.mkv', '.m4v', '.wmv'],
  outputSuffix: ' [SQUISH]',
  outputExtension: 'mkv',
  deleteSource: true,
  queueStateFile: path.resolve(projectRoot, 'squish-queue-state.json')
};
