const util = require('./util');
const State = require('./state');
const { ANNOTATIONTYPE } = require('./const');

function getRealLine(match1, match2) {
  if (match2) {
    return match1.split(',')[0];
  }

  return match1;
}

function getDiffInfo(diffContent) {
  const content = diffContent.split('\n');
  const info = [];
  let curIndex = -1;
  const reg = /^@@\s[+|-]{1}([0-9]+(,[0-9]+)?)\s[+|-]{1}([0-9]+(,[0-9]+)?)\s@@/;
  content.forEach(item => {
    if (item.startsWith('@@')) {
      // @@开头的再进行正则匹配，避免每行都正则匹配
      const diffLineInfo = item.match(reg);
      if (diffLineInfo) {
        curIndex++;
        info[curIndex] = {
          oldFileStartLine: getRealLine(diffLineInfo[1], diffLineInfo[2]),
          newFileStartLine: getRealLine(diffLineInfo[3], diffLineInfo[4]),
          fileContent: []
        };
        return;
      }
    }

    if (curIndex > -1 && info[curIndex] && info[curIndex].fileContent) {
      info[curIndex].fileContent.push(item);
    }
  });

  return info;
}

function hasOtherCodeInLine(annotationInfos, curLineNumber, codeLineInfo) {
  const reg = /\S+/;
  const codeLineString = codeLineInfo[curLineNumber - 1];
  if (annotationInfos[0].type === ANNOTATIONTYPE.LINE) {
    // 行注释
    const otherCodeString = codeLineString.substring(0, annotationInfos[0].start.col - 1);

    if (otherCodeString.match(reg)) {
      // 有非空字符，就是有其他代码段
      return true;
    }
  } else {
    const section = [];
    annotationInfos.forEach((item) => {
      if ((item.start.row !== item.end.row) && item.end.row === curLineNumber) {
        section.push({
          start: 1,
          end: item.end.col
        });
      } else if (item.type === ANNOTATIONTYPE.LINE) {
        section.push({
          start: item.start.col,
          end: codeLineString.length
        });
      } else if ((item.start.row !== item.end.row) && item.start.row === curLineNumber) {
        section.push({
          start: item.start.col,
          end: codeLineString.length
        });
      } else {
        section.push({
          start: item.start.col,
          end: item.end.col
        });
      }
    })

    let otherCodeString = codeLineString;
    for (let i = section.length - 1; i >= 0; i--) {
      const temp = otherCodeString;
      otherCodeString = temp.substring(0, section[i].start - 1);
      if (section[i].end < temp.length) {
        otherCodeString += temp.substring(section[i].end, temp.length);
      }
    }

    if (otherCodeString.match(reg)) {
      // 有非空字符，就是有其他代码段
      return true;
    }
  }

  return false;
}

function compareAnnotationDiff(changeLines, fileAnnotationInfo, fileView) {
  let changeLinesIndex = 0, fileAnnotationInfoIndex = 0;
  let annotationLineCount = 0, otherLineCount = 0;

  if (!fileAnnotationInfo || !fileAnnotationInfo.length) {
    // 不存在注释信息
    return {
      annotationLineCount: 0,
      otherLineCount: changeLines.length
    }
  }

  const codeLineInfo = fileView.split('\n');

  while (changeLinesIndex < changeLines.length) {
    const curLineNumber = changeLines[changeLinesIndex];
    const curAnnotationInfo = fileAnnotationInfo[fileAnnotationInfoIndex];

    if (!curAnnotationInfo) {
      // 后面的行都没有注释了
      return {
        annotationLineCount,
        otherLineCount: otherLineCount + changeLines.length - changeLinesIndex
      }
    }

    if (curLineNumber < curAnnotationInfo.start.row) {
      // 该行修改没有注释
      otherLineCount++;
      changeLinesIndex++;
    } else if (curLineNumber > curAnnotationInfo.end.row || (curLineNumber === curAnnotationInfo.end.row && curAnnotationInfo.type === "Line")) {
      fileAnnotationInfoIndex++;
    } else {
      const tempAnnotationInfoList = [curAnnotationInfo];
      // 该行有注释
      if (curAnnotationInfo.type === ANNOTATIONTYPE.LINE) {
        // 行注释，只看前面是否有代码了
        if (hasOtherCodeInLine(tempAnnotationInfoList, curLineNumber, codeLineInfo)) {
          otherLineCount++;
        }
      } else if (curLineNumber === curAnnotationInfo.start.row || curLineNumber === curAnnotationInfo.end.row) {
        // 在一行的块注释，要看看下个注释是否也在这行            // 跨行的块注释
        let whileBreak = false;
        let nextFileAnnotationInfoIndex = fileAnnotationInfoIndex;
        while(!whileBreak) {
          nextFileAnnotationInfoIndex++;
          let nextAnnotationInfo = fileAnnotationInfo[nextFileAnnotationInfoIndex];
          if (nextAnnotationInfo) {
            if (nextAnnotationInfo.type === ANNOTATIONTYPE.BLOCK) {
              if (nextAnnotationInfo.start.row === curLineNumber) {
                tempAnnotationInfoList.push(nextAnnotationInfo);
              } else {
                whileBreak = true;
              }
            } else if (nextAnnotationInfo.type === ANNOTATIONTYPE.LINE && nextAnnotationInfo.start.row === curLineNumber) {
              tempAnnotationInfoList.push(nextAnnotationInfo);
              whileBreak = true;
            } else {
              whileBreak = true;
            }
          } else {
            whileBreak = true;
          }
        }
        fileAnnotationInfoIndex = nextFileAnnotationInfoIndex - 1;

        if (hasOtherCodeInLine(tempAnnotationInfoList, curLineNumber, codeLineInfo)) {
          otherLineCount++;
        }
      } // else 剩下的就是curLineNumber > curAnnotationInfo.start.row && curLineNumber < curAnnotationInfo.end.row的了，这种就是跨行的块注释，中间不会有其他代码的

      annotationLineCount++;
      changeLinesIndex++;
    }
  }

  return {
    annotationLineCount,
    otherLineCount
  }

}

async function getFileDiffInfo(fileInfo) {
  let fileView = await util.getFileView(':' + fileInfo.filePath);
  const fileAnnotationInfo = new State(fileView).getCodeAnnotationInfo();

  const diffContent = await util.getGitDiffContent(fileInfo.filePath);
  const diffInfo = getDiffInfo(diffContent);
  const changeLines = [];
  // console.log(diffInfo);
  diffInfo.forEach(item => {
    let start = Number(item.newFileStartLine) - 1;
    item.fileContent.forEach(fileLine => {
      if (fileLine.startsWith(' ')) {
        ++start;
      }

      if (fileLine.startsWith('+')) {
        changeLines.push(++start);
      }
    });
  });

  return {
    ...compareAnnotationDiff(changeLines, fileAnnotationInfo, fileView),
    totalLineCount: changeLines.length
  };
}

module.exports = {
  getFileDiffInfo
};
