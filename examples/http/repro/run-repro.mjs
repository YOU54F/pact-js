import { spawnSync } from 'node:child_process';

const runs = Number(process.env.REPRO_RUNS ?? 10);
const command = ['run', 'test:repro'];

let failedRuns = 0;
let matchedExpectedFailure = 0;

for (let run = 1; run <= runs; run += 1) {
  process.stdout.write(`\n=== Repro run ${run}/${runs} ===\n`);

  const result = spawnSync('npm', command, {
    env: process.env,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  process.stdout.write(output);

  if (result.status !== 0) {
    failedRuns += 1;
    if (output.includes('expected request not received')) {
      matchedExpectedFailure += 1;
    }
  }
}

process.stdout.write('\n=== Repro summary ===\n');
process.stdout.write(`Total runs: ${runs}\n`);
process.stdout.write(`Failed runs: ${failedRuns}\n`);
process.stdout.write(
  `Failures containing \"expected request not received\": ${matchedExpectedFailure}\n`,
);

if (failedRuns > 0) {
  process.exitCode = 1;
}
