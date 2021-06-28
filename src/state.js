const { STATUS, TOKEN, STATUSMAPS, OPTYPE, ANNOTATIONTYPE } = require('./const');

const ANNOTATIONTYPE1 =  {
  [TOKEN.SLASH.key]: {
    type: OPTYPE.PUSH,
    value: STATUS.ANNOTATIONTYPE2
  },
  [TOKEN.ASTERISK.key]: {
    type: OPTYPE.PUSH,
    value: STATUS.ANNOTATIONTYPE3
  },
  [TOKEN.OTHER.key]: {
    type: OPTYPE.PUSH,
    value: STATUS.REGTYPE1
  }
};

const ANNOTATIONTYPE2 = {
  [TOKEN.ENTER.key]: {
    type: OPTYPE.POP,
    step: 2
  }
}

const ANNOTATIONTYPE4 = {
  [TOKEN.SLASH.key]: {
    type: OPTYPE.POP,
    step: 3
  },
  [TOKEN.OTHER.key]: {
    type: OPTYPE.POP
  }
}

function State(codeString) {
  this.codeString = codeString;
  this.codeAnnotationInfo = [];
  this.status = [STATUS.START];
  this.tokenKeyMapCache = {};
  this.curIndex = -1;
  this.row = 1; // 行号
  this.col = 0; // 列号
  this.run();
}

State.prototype.dealStatus = function(tokenConfig) {
  if (!tokenConfig) {
    return;
  }

  let { type, step, value } = tokenConfig;

  if (!step) {
    step = 1;
  }

  for (let i = 0; i < step; i++) {
    this.status[type](value);
  }
}

State.prototype.dealToken = function(token) {
  const curTokenKey = this.getTokenKey(token);
  const curStatus = this.status[this.status.length - 1];
  const curStatusTokenConfig = STATUSMAPS[curStatus];

  if (curStatusTokenConfig) {
    if (curStatusTokenConfig[TOKEN.ANY.key]) {
      this.dealStatus(curStatusTokenConfig[TOKEN.ANY.key]);
      return;
    }

    if (curStatusTokenConfig[curTokenKey]) {
      this.dealStatus(curStatusTokenConfig[curTokenKey]);
      return;
    }

    if (curStatusTokenConfig[TOKEN.OTHER.key]) {
      this.dealStatus(curStatusTokenConfig[TOKEN.OTHER.key]);
      return;
    }

  } else if (curStatus === STATUS.ANNOTATIONTYPE1) {
    if (curTokenKey === TOKEN.SLASH.key) {
      // 斜杠; 行注释开始; 记录下注释开始的坐标
      this.codeAnnotationInfo.push({
        start: {
          row: this.row,
          col: this.col - 1,
          index: this.curIndex - 1
        },
        type: ANNOTATIONTYPE.LINE
      });
      this.dealStatus(ANNOTATIONTYPE1[curTokenKey]);
    } else if (curTokenKey === TOKEN.ASTERISK.key) {
      // 块注释
      this.codeAnnotationInfo.push({
        start: {
          row: this.row,
          col: this.col - 1,
          index: this.curIndex - 1
        },
        type: ANNOTATIONTYPE.BLOCK
      });
      this.dealStatus(ANNOTATIONTYPE1[curTokenKey]);
    } else {
      // 判断是否为正则表达式
      if (this.checkIsReg()) {
        // 正则表达式
        this.dealStatus(ANNOTATIONTYPE1[TOKEN.OTHER.key]);
      } else {
        // 可能是运算表达式，直接返回start状态
        this.dealStatus({
          type: OPTYPE.POP
        });
      }
    }
  } else if (curStatus === STATUS.ANNOTATIONTYPE4) {
    if (curTokenKey === TOKEN.SLASH.key) {
      // 块注释结束
      this.codeAnnotationInfo[this.codeAnnotationInfo.length - 1].end = {
        row: this.row,
        col: this.col,
        index: this.curIndex
      };

      this.dealStatus(ANNOTATIONTYPE4[curTokenKey]);
    } else {
      this.dealStatus(ANNOTATIONTYPE4[TOKEN.OTHER.key])
    }
  } else if (curStatus === STATUS.ANNOTATIONTYPE2) {
    if (curTokenKey === TOKEN.ENTER.key) {
      // 行注释结束
      this.codeAnnotationInfo[this.codeAnnotationInfo.length - 1].end = {
        row: this.row,
        col: this.col,
        index: this.curIndex
      };
      this.dealStatus(ANNOTATIONTYPE2[curTokenKey]);
    }
  }
}

State.prototype.checkIsAnnotation = function(index) {
  for (let i = this.codeAnnotationInfo.length - 1; i >= 0; i--) {
    if (index >= this.codeAnnotationInfo[i].start.index && index <= this.codeAnnotationInfo[i].end.index) {
      return true;
    }
  }

  return false;
}

State.prototype.checkIsReg = function() {
  let curIndex = this.curIndex - 1;
  const reg = /\s/;
  // 前一个，向前检查
  let token = ' ';
  while(reg.test(token) && curIndex >= 0) {
    do {
      --curIndex;
    }
    while (this.checkIsAnnotation(curIndex) && curIndex >= 0);

    token = this.codeString[curIndex];
  }

  if (curIndex === -1) {
    return true;
  }

  if (['(', ':', ",", "=", ";", "{", "}", "?", ">", "!", "[", "+", "-", "|", "&", "~", "^", "*", "%"].indexOf(token) > -1) {
    return true;
  }

  return false;
}

State.prototype.run = function() {
  let token = this.readToken();
  while(token !== null) {
    this.dealToken(token);
    token = this.readToken();
  }
}

State.prototype.getTokenKey = function (token) {
  if (this.tokenKeyMapCache[token]) {
    return this.tokenKeyMapCache[token]
  }

  Object.keys(TOKEN).some(item => {
    if (TOKEN[item].value === token) {
      this.tokenKeyMapCache[token] = TOKEN[item].key;
      return true;
    }

    return false;
  });

  return this.tokenKeyMapCache[token];
}

State.prototype.readToken = function() {
  this.curIndex++;
  if (this.curIndex <= this.codeString.length) {
    const token = this.codeString[this.curIndex];
    if (token === '\n') {
      // 换行了
      this.row++;
      this.col = 0;
    } else {
      this.col++;
    }

    return token;
  }

  return null;
}

State.prototype.getCodeAnnotationInfo = function() {
  return this.codeAnnotationInfo
}

module.exports = State;
