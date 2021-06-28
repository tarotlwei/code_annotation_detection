const { spawn } = require('child_process');

function spawnUtil({ cmd, arg, success }) {
  const gitLog = spawn(cmd, arg);
  let result = '';

  gitLog.stdout.on('data', (data) => {
    result += data;
  });

  gitLog.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  gitLog.on('close', (code) => {
    if (code === 0) {
      // 正常退出
      success && success(result);
    }
  });
}

function getGitDiffContent(filePath) {
  return new Promise((resolve, reject) => {
    spawnUtil({
      cmd: 'git',
      arg: ['diff', '--cached', filePath],
      success(result) {
        resolve(result);
      }
    });
  });
}

function getStagedFileList() {
  return new Promise((resolve) => {
    spawnUtil({
      cmd: 'git',
      arg: ['status', '-s'],
      success(result) {
        resolve(result);
      }
    });
  });
}

function getFileView(path) {
  return new Promise(resolve => {
    spawnUtil({
      cmd: 'git',
      arg: ['show', '--textconv', path],
      success(result) {
        resolve(result);
      }
    });
  });
}

module.exports = {
  getGitDiffContent,
  getStagedFileList,
  getFileView
};
