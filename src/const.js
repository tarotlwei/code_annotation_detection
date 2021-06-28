const STATUS = {
  START: 1,
  STRINGTYPE1: 2,
  STRINGTYPE2: 3,
  STRINGTYPE3: 4,
  TRANSLATION: 5,
  EXPRESSIONTYPE1: 6,
  EXPRESSIONTYPE2: 7,
  ANNOTATIONTYPE1: 8,
  ANNOTATIONTYPE2: 9,
  ANNOTATIONTYPE3: 10,
  ANNOTATIONTYPE4: 11,
  REGTYPE1: 12,
  REGTYPE2: 13
};

const TOKEN = {
  SINGLEQUOTATION: {
    key: 'SINGLEQUOTATION',
    value: "'"
  },
  DOUBLEQUOTATION: {
    key: 'DOUBLEQUOTATION',
    value: '"'
  },
  BACKQUOTATION: {
    key: 'BACKQUOTATION',
    value: '`'
  },
  SLASH: {
    key: 'SLASH',
    value: '/'
  },
  BACKSLASH: {
    key: 'BACKSLASH',
    value: '\\'
  },
  DOLLAR: {
    key: 'DOLLAR',
    value: '$'
  },
  LEFTBRACKET: {
    key: 'LEFTBRACKET',
    value: '{'
  },
  RIGHTBRACKET: {
    key: 'RIGHTBRACKET',
    value: '}'
  },
  ASTERISK: {
    key: 'ASTERISK',
    value: '*'
  },
  ENTER: {
    key: 'ENTER',
    value: '\n'
  },
  ANY: {
    key: 'ANY'
  },
  OTHER: {
    key: 'OTHER'
  }
};

const OPTYPE = {
  PUSH: 'push',
  POP: 'pop'
};

// 【腾讯文档】注释解析状态机
// https://docs.qq.com/flowchart/DUlN4R2VVelFWWmdr

const STATUS_START_MAP = {
  [TOKEN.SINGLEQUOTATION.key]: {
    type: OPTYPE.PUSH,
    value: STATUS.STRINGTYPE1
  },
  [TOKEN.DOUBLEQUOTATION.key]: {
    type: OPTYPE.PUSH,
    value: STATUS.STRINGTYPE2
  },
  [TOKEN.BACKQUOTATION.key]: {
    type: OPTYPE.PUSH,
    value: STATUS.STRINGTYPE3
  },
  [TOKEN.SLASH.key]: {
    type: OPTYPE.PUSH,
    value: STATUS.ANNOTATIONTYPE1
  },
  [TOKEN.BACKSLASH.key]: {
    type: OPTYPE.PUSH,
    value: STATUS.TRANSLATION
  }
};

const STATUSMAPS = {
  [STATUS.START]: STATUS_START_MAP,
  [STATUS.STRINGTYPE1]: {
    [TOKEN.SINGLEQUOTATION.key]: {
      type: OPTYPE.POP
    },
    [TOKEN.BACKSLASH.key]: {
      type: OPTYPE.PUSH,
      value: STATUS.TRANSLATION
    }
  },
  [STATUS.STRINGTYPE2]: {
    [TOKEN.DOUBLEQUOTATION.key]: {
      type: OPTYPE.POP
    },
    [TOKEN.BACKSLASH.key]: {
      type: OPTYPE.PUSH,
      value: STATUS.TRANSLATION
    }
  },
  [STATUS.STRINGTYPE3]: {
    [TOKEN.BACKQUOTATION.key]: {
      type: OPTYPE.POP
    },
    [TOKEN.DOLLAR.key]: {
      type: OPTYPE.PUSH,
      value: STATUS.EXPRESSIONTYPE1
    },
    [TOKEN.BACKSLASH.key]: {
      type: OPTYPE.PUSH,
      value: STATUS.TRANSLATION
    }
  },
  [STATUS.TRANSLATION]: {
    [TOKEN.ANY.key]: {
      type: OPTYPE.POP
    }
  },
  [STATUS.EXPRESSIONTYPE1]: {
    [TOKEN.LEFTBRACKET.key]: {
      type: OPTYPE.PUSH,
      value: STATUS.EXPRESSIONTYPE2
    },
    [TOKEN.OTHER.key]: {
      type: OPTYPE.POP
    }
  },
  [STATUS.EXPRESSIONTYPE2]: {
    [TOKEN.RIGHTBRACKET.key]: {
      type: OPTYPE.POP,
      step: 2
    },
    ...STATUS_START_MAP
  },
  [STATUS.REGTYPE1]: {
    [TOKEN.BACKSLASH.key]: {
      type: OPTYPE.PUSH,
      value: STATUS.REGTYPE2
    },
    [TOKEN.SLASH.key]: {
      type: OPTYPE.POP,
      step: 2
    }
  },
  [STATUS.REGTYPE2]: {
    [TOKEN.ANY.key]: {
      type: OPTYPE.POP
    }
  },
  [STATUS.ANNOTATIONTYPE3]: {
    [TOKEN.ASTERISK.key]: {
      type: OPTYPE.PUSH,
      value: STATUS.ANNOTATIONTYPE4
    }
  }
};

const ANNOTATIONTYPE = {
  BLOCK: 'Block', //块注释
  LINE: 'Line' //行注释
};

module.exports = {
  STATUS, TOKEN, STATUSMAPS, OPTYPE, ANNOTATIONTYPE
};
