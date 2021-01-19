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

const serverNames = require('../sub/serverNames.json');
const Cluster = require("cluster");
const Const = require('../const');
const IOLog = require('../sub/jjlog');

let SID = Number(process.argv[2]);
let CPU = Number(process.argv[3]); //require("os").cpus().length;

const serverName = serverNames[SID];
global.serverName = serverName;
global.serverIdentity = 'none';

if (isNaN(SID)) {
    if (process.argv[2] == "test") {
        global.test = true;
        CPU = 1;
    } else {
        IOLog.emerg(`Invalid Server ID ${process.argv[2]}`);
        process.exit(1);
    }
}
if (isNaN(CPU)) {
    IOLog.emerg(`Invalid CPU Number ${process.argv[3]}`);
    process.exit(1);
}
if (Cluster.isMaster) {
    global.serverIdentity = 'master';

    var channels = {}, chan;
    var i;

    for (i = 0; i < CPU; i++) {
        chan = i + 1;
        channels[chan] = Cluster.fork({
            SERVER_NO_FORK: true,
            KKUTU_PORT: Const.MAIN_PORTS[SID] + 416 + i,
            CHANNEL: chan
        });
    }
    Cluster.on('exit', function (w) {
        for (i in channels) {
            if (channels[i] == w) {
                chan = Number(i);
                break;
            }
        }
        IOLog.emerg(`Worker @${chan} ${w.process.pid} died`);
        channels[chan] = Cluster.fork({
            SERVER_NO_FORK: true,
            KKUTU_PORT: Const.MAIN_PORTS[SID] + 416 + (chan - 1),
            CHANNEL: chan
        });
    });
    process.env['KKUTU_PORT'] = Const.MAIN_PORTS[SID];
    require("./master.js").init(SID.toString(), channels);
} else {
    const channel = process.env['CHANNEL'];
    global.serverIdentity = `slave-${channel}`;

    require("./slave.js");
}