#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();

program
    .option('-f --foreach', '分别计算每一个变更文件的注释覆盖率,默认合并计算所有的')
    .option('-b --brk', '阻塞后续的执行')
    .option('-p --percentage <value>', '注释覆盖率的百分比,默认1,既百分之1')
    .option('-m --min <line>', '最小开始检测行数，小于这个行数不检测,默认30');

program.parse(process.argv);

const options = program.opts();

if (options.percentage && Number.isNaN(Number(options.percentage))) {
    throw new Error('input option percentage type error');
}

if (options.min && Number.isNaN(Number(options.min))) {
    throw new Error('input option min type error');
}

const main = require('../src/index');
main(options);