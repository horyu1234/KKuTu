// Created by hatty163 (admin@hatty163.kr)

const winston = require('winston');
require('winston-daily-rotate-file');

const serverType = process.env['KKT_SV_TYPE'] === undefined ? "kkutu" : process.env['KKT_SV_TYPE'];
const { combine, timestamp, label, printf } = winston.format;
const logFormat = printf(({ level, message, label, timestamp }) => {
	return `${timestamp} [${label}] ${level}: ${message}`;
});

const logLevels = {
	levels: {
		emerg: 0,
		error: 1,
		warn: 2,
		alert: 3,
		success: 4,
		info: 5,
		logg: 6
	},
	colors: {
		emerg: 'bold white redBG',
		error: 'red',
		warn: 'bold white yellowBG',
		alert: 'yellow',
		success: 'bold green',
		info: 'cyan',
		logg: 'white'
	}
};

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
	levels: logLevels.levels,
	transports: [
		transport
	],
	exitOnError: false,
});

winston.addColors(logLevels.colors);

module.exports = logger;
module.exports.log = function(text){
	logger.logg(text);
};