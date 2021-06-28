const util = require('./util');
const diff = require('./diff');

async function main(option) {
  let pass;
  try {
    pass = await run(option);
  } catch (error) {
    console.error(error);
  }

  if (option.brk && !pass) {
    // 阻塞后续
    console.error('code annotation detection no pass');
    process.exit(1);
  } else {
    process.exit(0);
  }
}

async function run(option) {
  const stagedFileListString = await util.getStagedFileList();
  const fileNameList = [];
  if (stagedFileListString) {
    stagedFileListString.split('\n').forEach(item => {
      const char = item.charAt(0);
      if (char === "M" || char === "A") {
        fileNameList.push({
          filePath: item.substring(3),
          type: char
        });
      }
    });
  }

  option.min = option.min || '30';
  option.percentage = option.percentage || '1';
  let pass = true;
  let totalAnnotationLineCount = 0, totalOtherLineCount = 0, totalLineCount = 0;

  for (let i = 0; i < fileNameList.length; i++) {
    const value = {...await diff.getFileDiffInfo(fileNameList[i]), filePath: fileNameList[i].filePath};
    if (option.foreach) {
      // 分别计算每个文件的覆盖率
      if (value.totalLineCount < Number(option.min)) {
        console.log(`${value.filePath}代码变更${value.totalLineCount}行,小于${option.min}行，不进行代码注释率校验`);
        continue;
      }
      const percentage = calculation(value);
      if (percentage < Number(option.percentage)) {
        pass = false;
        console.error(`${value.filePath}代码变更${value.totalLineCount}行，其中注释${value.annotationLineCount}行，其它代码${value.otherLineCount}行，注释覆盖率为:${percentage}%，小于${option.percentage}%`);
      } else {
        console.log(`${value.filePath}代码变更${value.totalLineCount}行，其中注释${value.annotationLineCount}行，其它代码${value.otherLineCount}行，注释覆盖率为:${percentage}%`);
      }
    } else {
      // 合并计算总的
      totalAnnotationLineCount += value.annotationLineCount;
      totalOtherLineCount += value.otherLineCount;
      totalLineCount += value.totalLineCount
    }
  }

  if (option.foreach) {
    return pass;
  }

  const percentage = calculation({
    annotationLineCount: totalAnnotationLineCount,
    otherLineCount: totalOtherLineCount
  });

  if (percentage < Number(option.percentage)) {
    pass = false;
    console.error(`代码变更${totalLineCount}行，其中注释${totalAnnotationLineCount}行，其它代码${totalOtherLineCount}行，代码注释覆盖率为${percentage}%, 小于${option.percentage}%`);
  } else {
    console.log(`代码变更${totalLineCount}行，其中注释${totalAnnotationLineCount}行，其它代码${totalOtherLineCount}行，代码注释覆盖率为${percentage}%,`);
  }

  return pass;
}

function calculation({ annotationLineCount, otherLineCount }) {
  if (!otherLineCount) {
    return 100;
  }

  const result = (annotationLineCount / otherLineCount * 100).toFixed(0);

  if (+result > 100) {
    return 100;
  }

  return Number(result);
}

module.exports = main;
