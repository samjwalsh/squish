import fs from 'fs';

import { Config, PresetGroup } from '../config';
import {
  createOutputLocation,
  createProgressLogger,
  getPresetName,
  loadQueueState,
  runHandBrakeJob,
  saveQueueState,
  type ProgressStats
} from './transcodeHelpers';

export type TranscodeFileResult = { name: string; presetId: string };

export type TranscodeResults = {
  errors: TranscodeFileResult[];
  success: TranscodeFileResult[];
  sourceNotDeleted: TranscodeFileResult[];
  handBrakeCommandFail: TranscodeFileResult[];
};

export type TranscodeSummary = {
  results: TranscodeResults;
  queuedFiles: string[];
  skippedFiles: string[];
};

type TranscodeJob = {
  file: string;
  outputLocation: string;
};

export const transcodeVideos = async (
  files: string[],
  config: Config
): Promise<TranscodeSummary> => {
  const startTime = Date.now();
  const queueState = loadQueueState(config.queueStateFile);
  const skippedFiles = files.filter((file) =>
    queueState.completed.includes(file)
  );
  const queuedFiles = files.filter(
    (file) => !queueState.completed.includes(file)
  );

  const results: TranscodeResults = {
    errors: [],
    success: [],
    sourceNotDeleted: [],
    handBrakeCommandFail: []
  };

  const jobs: TranscodeJob[] = queuedFiles.map((file) => ({
    file,
    outputLocation: createOutputLocation(
      file,
      config.outputSuffix,
      config.outputExtension
    )
  }));

  const runningCounts: Record<string, number> = {};
  const activeJobs = new Set<Promise<void>>();
  const runningFiles = new Map<string, string>();
  const progressLogger = createProgressLogger(
    `${config.inputDir}/Squish CRON.log`
  );

  const getStats = (): ProgressStats => {
    const running = Object.values(runningCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    return {
      running,
      queued: jobs.length,
      success: results.success.length,
      failed: results.errors.length,
      runningFiles: Array.from(runningFiles.entries()).map(
        ([file, presetId]) => `${presetId} | ${file}`
      ),
      elapsedMs: Date.now() - startTime
    };
  };

  const startJob = (job: TranscodeJob, presetGroup: PresetGroup) => {
    const presetId = presetGroup.id;
    runningCounts[presetId] = (runningCounts[presetId] ?? 0) + 1;
    runningFiles.set(job.file, presetId);

    const nowDoingMessage = `Transcoding (${presetId})`;
    progressLogger.log(nowDoingMessage, getStats(), { console: true });

    const jobPromise = runHandBrakeJob(
      {
        file: job.file,
        outputLocation: job.outputLocation,
        presetGroup,
        presetName: getPresetName(presetGroup)
      },
      config.handBrakeCLI
    )
      .then((encodeSuccess) => {
        if (encodeSuccess) {
          if (config.deleteSource) {
            try {
              fs.unlinkSync(job.file);
              results.success.push({ name: job.file, presetId });
              queueState.completed.push(job.file);
            } catch (e) {
              results.sourceNotDeleted.push({ name: job.file, presetId });
            }
          } else {
            results.success.push({ name: job.file, presetId });
            queueState.completed.push(job.file);
          }
        } else {
          results.errors.push({ name: job.file, presetId });
          queueState.failed.push(job.file);
        }
      })
      .catch(() => {
        results.handBrakeCommandFail.push({ name: job.file, presetId });
        queueState.failed.push(job.file);
      })
      .finally(() => {
        runningCounts[presetId] = Math.max(
          0,
          (runningCounts[presetId] ?? 1) - 1
        );
        runningFiles.delete(job.file);
        saveQueueState(queueState, config.queueStateFile);
        progressLogger.log('Updated queue state', getStats());
      });

    activeJobs.add(jobPromise);

    jobPromise.finally(() => {
      activeJobs.delete(jobPromise);
      maybeStartJobs();
    });
  };

  const maybeStartJobs = () => {
    let startedAny = false;

    for (const presetGroup of config.presetGroups) {
      const presetId = presetGroup.id;
      let running = runningCounts[presetId] ?? 0;

      while (running < presetGroup.maxInstances && jobs.length > 0) {
        const job = jobs.shift();
        if (!job) break;
        startJob(job, presetGroup);
        running += 1;
        startedAny = true;
      }
    }

    if (!startedAny && activeJobs.size === 0) {
      progressLogger.cleanup();
      return;
    }
  };

  maybeStartJobs();

  await Promise.all(Array.from(activeJobs));

  while (jobs.length > 0 || activeJobs.size > 0) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  progressLogger.cleanup();

  return { results, queuedFiles, skippedFiles };
};


