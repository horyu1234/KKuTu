// Created by hatty163 (admin@hatty163.kr)

const winston = require('winston');
const moment = require('moment');
require('winston-daily-rotate-file');

const serverType = process.env['KKT_SV_TYPE'] === undefined ? "game" : process.env['KKT_SV_TYPE'];
const { combine, label, printf } = winston.format;

const currentLocalTime = () => {
	return moment().format('YYYY-MM-DD HH:mm:ss');
};

const logFormat = printf(({ level, message, label}) => {
	return `${currentLocalTime()} [${label}] ${level}: ${message}`;
});

const transport = new (winston.transports.DailyRotateFile)({
	filename: './logs/' + serverType + '-%DATE%.log',
	datePattern: 'YYYY-MM-DD-HH',
	zippedArchive: true,
	maxSize: '20m',
	maxFiles: '14d',
	format: combine(
		label({ label: serverType }),
		logFormat
	)
});

let logger = winston.createLogger({
	transports: [
		transport
	],
	exitOnError: false,
});

const colors = require('colors');

function callLog(text){
	var date = new Date();
	var o = {
		year: 1900 + date.getYear(),
		month: date.getMonth() + 1,
		date: date.getDate(),
		hour: date.getHours(),
		minute: date.getMinutes(),
		second: date.getSeconds()
	}, i;

	for(i in o){
		if(o[i] < 10) o[i] = "0"+o[i];
		else o[i] = o[i].toString();
	}
	console.log("["+o.year+"-"+o.month+"-"+o.date+" "+o.hour+":"+o.minute+":"+o.second+"] "+text);
}

exports.log = function(text){
	logger.log({level: 'info',message: text});
	callLog(text);
};
exports.info = function(text){
	logger.log({level: 'info',message: text});
	callLog(text.cyan);
};
exports.success = function(text){
	logger.log({level: 'info',message: text});
	callLog(text.green);
};
exports.alert = function(text){
	logger.log({level: 'warn',message: text});
	callLog(text.yellow);
};
exports.warn = function(text){
	logger.log({level: 'warn',message: text});
	callLog(text.black.bgYellow);
};
exports.error = function(text){
	logger.log({level: 'error',message: text});
	callLog(text.bgRed);
};