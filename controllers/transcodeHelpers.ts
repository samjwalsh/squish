import fs from 'fs';
import { spawn } from 'child_process';

import { PresetGroup } from '../config';
import { nowDoing } from '../utils/consoleEffects';

export type QueueState = {
  completed: string[];
  failed: string[];
  updatedAt: string;
};

export type ProgressStats = {
  running: number;
  queued: number;
  success: number;
  failed: number;
  runningFiles: string[];
  elapsedMs: number;
};

export type ProgressLogger = {
  log: (message: string, stats: ProgressStats, options?: { console?: boolean }) => void;
  cleanup: () => void;
};

export type HandBrakeJob = {
  file: string;
  outputLocation: string;
  presetGroup: PresetGroup;
  presetName: string;
};

const presetNameCache = new Map<string, string>();

export const createProgressLogger = (logFilePath: string): ProgressLogger => {
  const log = (
    message: string,
    stats: ProgressStats,
    options?: { console?: boolean }
  ) => {
    if (options?.console) {
      nowDoing(message);
    }

    const elapsedMs = Math.max(0, stats.elapsedMs);
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    const elapsed = `${hours}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;

    const runningList =
      stats.runningFiles.length > 0
        ? stats.runningFiles.map((file) => ` - ${file}`).join('\n')
        : ' (none)';

    const fileOutput = `${message}\nElapsed: ${elapsed}\nRunning: ${stats.running}\nQueued: ${stats.queued}\nSucceeded: ${stats.success}\nFailed: ${stats.failed}\n\nCurrently transcoding:\n${runningList}`;
    try {
      fs.writeFileSync(logFilePath, fileOutput);
    } catch (e) {
      console.log(e);
    }
  };

  const cleanup = () => {
    try {
      if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
      }
    } catch (e) {
      console.log(e);
    }
  };

  return { log, cleanup };
};

export const runHandBrakeJob = (
  job: HandBrakeJob,
  handBrakeCLI: string
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const args = [
      '-i',
      job.file,
      '-o',
      job.outputLocation,
      '--preset-import-file',
      job.presetGroup.presetFile,
      '-Z',
      job.presetName
    ];

    const child = spawn(handBrakeCLI, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';

    child.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      output += data.toString();
    });

    child.on('error', (err: Error) => {
      reject(err);
    });

    child.on('close', (code: number | null) => {
      const encodeDone = output.includes('Encode done!');
      resolve(code === 0 || encodeDone);
    });
  });
};

export const createOutputLocation = (file: string, outputSuffix: string, outputExtension: string): string => {
  const outputParts = file.split('.');
  outputParts[outputParts.length - 2] = `${
    outputParts[outputParts.length - 2]
  }${outputSuffix}`;
  outputParts[outputParts.length - 1] = outputExtension;
  return outputParts.join('.');
};

export const getPresetName = (presetGroup: PresetGroup): string => {
  if (presetGroup.presetName) return presetGroup.presetName;

  const cached = presetNameCache.get(presetGroup.presetFile);
  if (cached) return cached;

  const presetJSON = JSON.parse(fs.readFileSync(presetGroup.presetFile, 'utf8'));
  const presetName = presetJSON.PresetList[0].PresetName;
  presetNameCache.set(presetGroup.presetFile, presetName);
  return presetName;
};

export const loadQueueState = (filePath?: string): QueueState => {
  if (!filePath) {
    return { completed: [], failed: [], updatedAt: new Date().toISOString() };
  }

  if (!fs.existsSync(filePath)) {
    return { completed: [], failed: [], updatedAt: new Date().toISOString() };
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as QueueState;
    return {
      completed: Array.isArray(data.completed) ? data.completed : [],
      failed: Array.isArray(data.failed) ? data.failed : [],
      updatedAt: data.updatedAt ?? new Date().toISOString()
    };
  } catch (e) {
    return { completed: [], failed: [], updatedAt: new Date().toISOString() };
  }
};

export const saveQueueState = (state: QueueState, filePath?: string) => {
  if (!filePath) return;
  const updatedState: QueueState = {
    ...state,
    updatedAt: new Date().toISOString()
  };
  try {
    fs.writeFileSync(filePath, JSON.stringify(updatedState, null, 2));
  } catch (e) {
    console.log(e);
  }
};
