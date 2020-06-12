/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var Cluster = require("cluster");
var CPU = Number(process.argv[2]); //require("os").cpus().length;
process.env['KKT_SV_TYPE'] = 'web';

if (isNaN(CPU)) {
    console.log(`Invalid CPU Number ${CPU}`);
    return;
    // process.exit(1);
}
if (Cluster.isMaster) {
    for (var i = 0; i < CPU; i++) {
        Cluster.fork({SERVER_NO_FORK: true, WS_KEY: i + 1});
    }
	/*ReportSystem (hatty163) [S]*/
	const fs = require('fs');
	const webHook = require('discord-webhook-node');
	const hook = new webHook.Webhook(GLOBAL['WEBHOOK_URI']);

	const cron = require('node-cron');
	cron.schedule('*/30 * * * *', () => {
		fs.stat('./report.log', function(err, stats){
			if(err) {
				console.log('[REPORT] File report.log does not exist. Creating a new file.');
				fs.writeFile('./report.log', '');
			} else if(stats["size"] == 0) {
				console.log('[REPORT] report.log is empty. Skipping.');
			} else {
				console.log('[REPORT] Excuting scheduled tasks...');
				fs.access('./report.log', err => {
					console.log('[REPORT] Uploading file report.log...');
					hook.info(`**${new Date().toLocaleString()}**`, '최근 30분간 인 게임 신고 내역', '아래 신고 내역을 확인하시기 바랍니다.');
					hook.sendFile('./report.log');
					fs.truncate('./report.log', 0, function(){console.log('[REPORT] Clearing report.log...')});
				});
			}
		});
	}, {
		scheduled: true,
		timezone: "Asia/Seoul"
	});
	/*ReportSystem (hatty163) [E]*/
    Cluster.on('exit', function (w) {
        console.log(`Worker ${w.process.pid} died`);
    });
} else {
    require("./main.js");
}