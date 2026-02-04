const recursive = require('recursive-readdir');

const appError = require('./../utils/appError');

exports.searchFolders = async (dir) => {
  let files = [];
  try {
    // Creates list of all files in dir
    files = await recursive(dir);
  } catch (e) {
    appError(`Couldn't read directory files`, true, e);
  }

  //Do various checks on the list of files
  files = removeTranscodedFiles(files);
  files = removeExcludedDirs(files);
  files = removeNonVideoFiles(files);

  files.sort();
  return files;
};

const removeTranscodedFiles = (files) => {
  let filteredFiles = [];

  files.forEach((file) => {
    //Does some stuff with arrays to see if the last thing before the file extension is [SQUISH]
    try {
      let tempfile = file.split('.');
      if (!tempfile[tempfile.length - 2].endsWith(' [SQUISH]')) {
        tempfile = tempfile.join('.');
        //Puts the file into filteredFiles if it didn't have the [SQUISH]
        filteredFiles.push(tempfile);
      }
      delete tempfile;
    } catch (e) {
      console.log(file);
    }
  });
  return filteredFiles;
};

const removeExcludedDirs = (files) => {
  let excludedDirs = ['/mnt/plexdrive/temp', '/mnt/plexdrive/MC'];
  let filteredFiles = [];

  files.forEach((file) => {
    let excluded = 0;
    //0 means not excluded, if it is excluded it will be raised by 1, so that at the end if it is greater than 1 it will be excluded
    excludedDirs.forEach((excludedDir) => {
      if (file.includes(excludedDir) == true) {
        excluded++;
      }
    });
    if (excluded === 0) filteredFiles.push(file);
  });

  return filteredFiles;
};

const removeNonVideoFiles = (files) => {
  let filteredFiles = [];

  files.forEach((file) => {
    if (
      file.endsWith('.mp4') ||
      file.endsWith('.avi') ||
      file.endsWith('.mov') ||
      file.endsWith('.mkv') ||
      file.endsWith('.m4v') ||
      file.endsWith('.wmv')
    ) {
      filteredFiles.push(file);
    }
  });

  return filteredFiles;
};
