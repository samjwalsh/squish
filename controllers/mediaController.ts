import recursive from 'recursive-readdir';

import appError from './../utils/appError';
import { config } from '../config';

export const searchFolders = async (dir: string): Promise<string[]> => {
  let files: string[] = [];
  try {
    files = await recursive(dir);
  } catch (e) {
    appError(`Couldn't read directory files`, true, e);
  }

  files = removeTranscodedFiles(files);
  files = removeExcludedDirs(files, config.excludedDirs);
  files = removeNonVideoFiles(files, config.videoExtensions);

  files.sort();
  return files;
};

const removeTranscodedFiles = (files: string[]): string[] => {
  const filteredFiles: string[] = [];

  files.forEach((file) => {
    try {
      const parts = file.split('.');
      if (parts.length < 2) return;
      const base = parts[parts.length - 2];
      if (!base.endsWith(config.outputSuffix)) {
        filteredFiles.push(file);
      }
    } catch (e) {
      console.log(file);
    }
  });
  return filteredFiles;
};

const removeExcludedDirs = (
  files: string[],
  excludedDirs: string[]
): string[] => {
  const filteredFiles: string[] = [];

  files.forEach((file) => {
    let excluded = 0;
    excludedDirs.forEach((excludedDir) => {
      if (file.includes(excludedDir) === true) {
        excluded++;
      }
    });
    if (excluded === 0) filteredFiles.push(file);
  });

  return filteredFiles;
};

const removeNonVideoFiles = (
  files: string[],
  extensions: string[]
): string[] => {
  const filteredFiles: string[] = [];

  files.forEach((file) => {
    if (extensions.some((ext) => file.toLowerCase().endsWith(ext))) {
      filteredFiles.push(file);
    }
  });

  return filteredFiles;
};
