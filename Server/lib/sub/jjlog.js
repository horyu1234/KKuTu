// Created by hatty163 (admin@hatty163.kr)

const winston = require('winston');
require('winston-daily-rotate-file');

const serverType = process.env['KKT_SV_TYPE'] === undefined ? "game" : process.env['KKT_SV_TYPE'];
const { combine, timestamp, label, printf } = winston.format;
const logFormat = printf(({ level, message, label, timestamp }) => {
	return `${timestamp} [${label}] ${level}: ${message}`;
});

const transport = new (winston.transports.DailyRotateFile)({
	filename: './logs/' + serverType + '-%DATE%.log',
	datePattern: 'YYYY-MM-DD-HH',
	zippedArchive: true,
	maxSize: '8m',
	maxFiles: '5d',
	format: combine(
		label({ label: serverType }),
		timestamp(),
		logFormat
	)
});

let logger = winston.createLogger({
	transports: [
		transport
	],
	exitOnError: false,
});

exports.log = function(text){
	logger.log({level: 'info',message: text});
};
exports.info = function(text){
	logger.log({level: 'info',message: text});
};
exports.success = function(text){
	logger.log({level: 'info',message: text});
};
exports.alert = function(text){
	logger.log({level: 'warn',message: text});
};
exports.warn = function(text){
	logger.log({level: 'warn',message: text});
};
exports.error = function(text){
	logger.log({level: 'error',message: text});
};