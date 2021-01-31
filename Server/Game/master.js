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
const Cluster = require("cluster");
const File = require('fs');
const WebSocket = require('ws');
const https = require('https');
var HTTPS_Server;
// const Heapdump = require("heapdump");
const KKuTu = require('./kkutu');
const Crypto = require("../sub/crypto");
const GLOBAL = require("../sub/global.json");
const Const = require("../const");
const IOLog = require('../sub/jjlog');
const Secure = require('../sub/secure');
const Recaptcha = require('../sub/recaptcha');
const moment = require("moment");

const geoIp = require('geoip-country');
const {Webhook, MessageBuilder} = require('discord-webhook-node');
const reportDiscordWebHook = new Webhook(Const.DISCORD_WEBHOOK.REPORT);
const suspicionOtherDiscordWebHook = new Webhook(Const.DISCORD_WEBHOOK.SUSPICION_OTHER);
const suspicion100MsDiscordWebHook = new Webhook(Const.DISCORD_WEBHOOK.SUSPICION_100MS);

var MainDB;

var Server;
var DIC = {};
var DNAME = {};
var ROOM = {};

var T_ROOM = {};
var T_USER = {};

var SID;
var WDIC = {};

var allowLobbyChat = true;

const DEVELOP = exports.DEVELOP = global.test || false;
const GUEST_PERMISSION = exports.GUEST_PERMISSION = {
    'create': true,
    'enter': true,
    'talk': true,
    'practice': true,
    'ready': true,
    'start': true,
    'invite': true,
    'inviteRes': true,
    'kick': true,
    'kickVote': true,
    'wp': true
};
const ENABLE_ROUND_TIME = exports.ENABLE_ROUND_TIME = [10, 30, 60, 90, 120, 150];
const ENABLE_FORM = exports.ENABLE_FORM = ["S", "J"];
const MODE_LENGTH = exports.MODE_LENGTH = Const.GAME_TYPE.length;
const PORT = process.env['KKUTU_PORT'];

const UserNickChange = require("../sub/UserNickChange");

process.on('uncaughtException', function (err) {
    const text = `:${PORT} [${new Date().toLocaleString()}] ERROR: ${err.toString()}\n${err.stack}\n`;
    IOLog.emerg(`ERROR OCCURRED ON THE MASTER! ${text}`);
});

function processAdmin(id, value) {
    var cmd, temp, i, j;

    value = value.replace(/^(#\w+\s+)?(.+)/, function (v, p1, p2) {
        if (p1) cmd = p1.slice(1).trim();
        return p2;
    });
    switch (cmd) {
        case "delroom":
            if (temp = ROOM[value]) {
                for (var i in ROOM[value].players) {
                    var $c = DIC[ROOM[value].players[i]];
                    if ($c) {
                        $c.send('yell', {value: "관리자에 의하여 접속 중이시던 방이 해체되었습니다."});
                        $c.send('roomStuck');
                    }
                }
                delete ROOM[value];
            }
            return null;
        case "roomtitle":
            var q = value.trim().split(" ");
            if (temp = ROOM[q[0]]) {
                temp.title = q[1];
                KKuTu.publish('room', {target: id, room: temp.getData(), modify: true}, temp.password);
            }
            return null;
        case "nick":
            MainDB.users.update(['_id', value]).set(['nick', '바른닉네임' + value.replace(/[^0-9]/g, "").substring(0, 4)]).on();
            if (temp = DIC[value]) {
                temp.socket.send('{"type":"error","code":410}');
                temp.socket.close();
            }
            return null;
        case "yell":
            KKuTu.publish('yell', {value: value});
            return null;
        case "kill":
            if (temp = DIC[value]) {
                temp.socket.send('{"type":"error","code":410}');
                temp.socket.close();
            }
            return null;
        case "ip":
            if (temp = DIC[value]) {
                if (DIC[id]) DIC[id].send('tail', {
                    a: "ip",
                    rid: temp.id,
                    id: id,
                    msg: temp.socket._socket.remoteAddress.slice(7)
                });
            }
            return null;
        case "tailroom":
            if (temp = ROOM[value]) {
                if (T_ROOM[value] == id) {
                    i = true;
                    delete T_ROOM[value];
                } else T_ROOM[value] = id;
                if (DIC[id]) DIC[id].send('tail', {
                    a: i ? "trX" : "tr",
                    rid: temp.id,
                    id: id,
                    msg: {pw: temp.password, players: temp.players}
                });
            }
            return null;
        case "tailuser":
            if (temp = DIC[value]) {
                if (T_USER[value] == id) {
                    i = true;
                    delete T_USER[value];
                } else T_USER[value] = id;
                temp.send('test');
                if (DIC[id]) DIC[id].send('tail', {a: i ? "tuX" : "tu", rid: temp.id, id: id, msg: temp.getData()});
            }
            return null;
        case "dump":
            if (DIC[id]) DIC[id].send('yell', {value: "This feature is not supported..."});
            /*Heapdump.writeSnapshot("/home/kkutu_memdump_" + Date.now() + ".heapsnapshot", function(err){
                if(err){
                    IOLog.error("Error when dumping!");
                    return IOLog.error(err.toString());
                }
                if(DIC[id]) DIC[id].send('yell', { value: "DUMP OK" });
                IOLog.notice("Dumping success.");
            });*/
            return null;
        case "lobbychat":
            if (!allowLobbyChat) {
                allowLobbyChat = true;

                DIC[id].send('chat', {notice: true, message: '로비 채팅을 활성화했습니다.'});
                IOLog.notice(`${id} 님이 로비 채팅을 활성화했습니다.`);
            } else if (allowLobbyChat) {
                allowLobbyChat = false;

                DIC[id].send('chat', {notice: true, message: '로비 채팅을 일시적으로 비활성화했습니다.'});
                IOLog.notice(`${id} 님이 로비 채팅을 일시적으로 비활성화했습니다.`);
            }
            return null;
    }
    return value;
}

function checkTailUser(id, place, msg) {
    let temp;

    if (temp = T_USER[id]) {
        if (!DIC[temp]) {
            delete T_USER[id];
            return;
        }
        DIC[temp].send('tail', {a: "user", rid: place, id: id, msg: msg});
    }
}

function narrateFriends(id, friends, stat) {
    if (!friends) return;
    var fl = Object.keys(friends);

    if (!fl.length) return;

    MainDB.users.find(['_id', {$in: fl}], ['server', /^\w+$/]).limit(['server', true]).on(function ($fon) {
        var i, sf = {}, s;

        for (i in $fon) {
            if (!sf[s = $fon[i].server]) sf[s] = [];
            sf[s].push($fon[i]._id);
        }
        if (DIC[id]) DIC[id].send('friends', {list: sf});

        if (sf[SID]) {
            KKuTu.narrate(sf[SID], 'friend', {id: id, s: SID, stat: stat});
            delete sf[SID];
        }
        for (i in WDIC) {
            WDIC[i].send('narrate-friend', {id: id, s: SID, stat: stat, list: sf});
            break;
        }
    });
}

Cluster.on('message', function (worker, msg) {
    var temp;

    switch (msg.type) {
        case "admin":
            if (DIC[msg.id] && DIC[msg.id].admin) processAdmin(msg.id, msg.value);
            break;
        case "tail-report":
            if (temp = T_ROOM[msg.place]) {
                if (!DIC[temp]) delete T_ROOM[msg.place];
                DIC[temp].send('tail', {a: "room", rid: msg.place, id: msg.id, msg: msg.msg});
            }
            checkTailUser(msg.id, msg.place, msg.msg);
            break;
        case "okg":
            if (DIC[msg.id]) DIC[msg.id].onOKG(msg.time);
            break;
        case "kick":
            if (DIC[msg.target]) DIC[msg.target].socket.close();
            break;
        case "invite":
            if (!DIC[msg.target]) {
                worker.send({type: "invite-error", target: msg.id, code: 417});
                break;
            }
            if (DIC[msg.target].place != 0) {
                worker.send({type: "invite-error", target: msg.id, code: 417});
                break;
            }
            if (!GUEST_PERMISSION.invite) if (DIC[msg.target].guest) {
                worker.send({type: "invite-error", target: msg.id, code: 422});
                break;
            }
            if (DIC[msg.target]._invited) {
                worker.send({type: "invite-error", target: msg.id, code: 419});
                break;
            }
            DIC[msg.target]._invited = msg.place;
            DIC[msg.target].send('invited', {from: msg.place});
            break;
        case "room-new":
            if (ROOM[msg.room.id] || !DIC[msg.target]) { // 이미 그런 ID의 방이 있다... 그 방은 없던 걸로 해라.
                worker.send({type: "room-invalid", room: msg.room});
            } else {
                ROOM[msg.room.id] = new KKuTu.Room(msg.room, msg.room.channel);
            }
            break;
        case "room-come":
            if (ROOM[msg.id] && DIC[msg.target]) {
                ROOM[msg.id].come(DIC[msg.target]);
            } else {
                IOLog.warn(`Wrong room-come id=${msg.id}&target=${msg.target}`);
            }
            break;
        case "room-spectate":
            if (ROOM[msg.id] && DIC[msg.target]) {
                ROOM[msg.id].spectate(DIC[msg.target], msg.pw);
            } else {
                IOLog.warn(`Wrong room-spectate id=${msg.id}&target=${msg.target}`);
            }
            break;
        case "room-go":
            if (ROOM[msg.id] && DIC[msg.target]) {
                ROOM[msg.id].go(DIC[msg.target]);
            } else {
                // 나가기 말고 연결 자체가 끊겼을 때 생기는 듯 하다.
                IOLog.warn(`Wrong room-go id=${msg.id}&target=${msg.target}`);
                if (ROOM[msg.id] && ROOM[msg.id].players) {
                    // 이 때 수동으로 지워준다.
                    var x = ROOM[msg.id].players.indexOf(msg.target);

                    if (x != -1) {
                        ROOM[msg.id].players.splice(x, 1);
                        IOLog.warn(`^ OK`);
                    }
                }
                if (msg.removed) delete ROOM[msg.id];
            }
            break;
        case "user-publish":
            if (temp = DIC[msg.data.id]) {
                for (var i in msg.data) {
                    temp[i] = msg.data[i];
                }
            }
            break;
        case "room-publish":
            if (temp = ROOM[msg.data.room.id]) {
                for (var i in msg.data.room) {
                    temp[i] = msg.data.room[i];
                }
                temp.password = msg.password;
            }
            KKuTu.publish('room', msg.data);
            break;
        case "room-expired":
            if (msg.create && ROOM[msg.id]) {
                for (var i in ROOM[msg.id].players) {
                    var $c = DIC[ROOM[msg.id].players[i]];

                    if ($c) $c.send('roomStuck');
                }
                delete ROOM[msg.id];
            }
            break;
        case "room-invalid":
            delete ROOM[msg.room.id];
            break;
        default:
            IOLog.warn(`Unhandled IPC message type: ${msg.type}`);
    }
});
exports.init = function (_SID, CHAN) {
    SID = _SID;
    MainDB = require('../sub/db');
    MainDB.ready = function () {
        IOLog.notice("마스터 데이터베이스가 준비되었습니다.");

        MainDB.users.update(['server', SID]).set(['server', ""]).on();

        if (Const.IS_WS_SECURED) {
            const options = Secure();
            HTTPS_Server = https.createServer(options)
                .listen(global.test ? (Const.TEST_PORT + 416) : process.env['KKUTU_PORT']);
            Server = new WebSocket.Server({server: HTTPS_Server});
        } else {
            Server = new WebSocket.Server({
                port: global.test ? (Const.TEST_PORT + 416) : process.env['KKUTU_PORT'],
                perMessageDeflate: false
            });
        }
        Server.on('connection', function (socket, req) {
            socket.upgradeReq = req;

            let isWebServer = false;
            let key = socket.upgradeReq.url.slice(1);

            if (key.startsWith(GLOBAL.WEB_KEY)) {
                isWebServer = true;
                key = key.replace(`${GLOBAL.WEB_KEY}:`, '')
            } else {
                // 토큰 복호화
                try {
                    key = Crypto.decrypt(socket.upgradeReq.url.slice(1), GLOBAL.CRYPTO_KEY);
                } catch (exception) {
                    key = ".";
                }

                // 토큰 값 검사
                var pattern = /^[0-9a-zA-Z_-]{32}$/;
                if (!pattern.test(key)) {
                    socket.send(`{ "type": "error", "code": "400" }`);
                    return;
                }
            }

            var $c;
            socket.on('error', function (err) {
                IOLog.warn("Error on #" + key + " on ws: " + err.toString());
            });

            // 웹 서버
            if (isWebServer) {
                if (WDIC[key]) WDIC[key].socket.close();
                WDIC[key] = new KKuTu.WebServer(socket);
                IOLog.notice(`새로운 웹서버와 연결되었습니다. #${key}`);
                WDIC[key].socket.on('close', function () {
                    IOLog.notice(`웹서버와 연결이 끊겼습니다. #${key}`);
                    WDIC[key].socket.removeAllListeners();
                    delete WDIC[key];
                });
                return;
            }

            MainDB.session.findOne(['_id', key]).limit(['profile', true]).on(function ($body) {
                $c = new KKuTu.Client(socket, $body ? $body.profile : null, key);
                $c.admin = GLOBAL.ADMIN.indexOf($c.id) != -1;

                if (!$c.admin && Object.keys(DIC).length >= Const.KKUTU_MAX) {
                    $c.sendError('full');
                    $c.socket.close();

                    IOLog.notice(`서버에 남은 자리가 없으므로 ${$c.profile.title}(${$c.id}) 님의 접속을 거부합니다.`);
                    return;
                }

                if (DIC[$c.id]) {
                    DIC[$c.id].sendError(408);
                    DIC[$c.id].socket.close();
                }
                if (DEVELOP && !Const.TESTER.includes($c.id)) {
                    $c.sendError(500);
                    $c.socket.close();
                    return;
                }
                if ($c.guest) {
                    if (SID !== "0" && SID !== "1") {
                        $c.sendError(402);
                        $c.socket.close();
                        return;
                    }
                    if (KKuTu.NIGHT) {
                        $c.sendError(440);
                        $c.socket.close();
                        return;
                    }

                    var userIp = $c.socket.upgradeReq.connection.remoteAddress;
                    var lookuped = geoIp.lookup(userIp);
                    var geoCountry = lookuped ? lookuped['country'] : 'NONE'

                    if (geoCountry !== 'KR') {
                        IOLog.info(`해외에서 손님으로 접속을 시도하였습니다. 아이피: ${userIp} 국가: ${geoCountry}`)
                        $c.sendError(449);
                        $c.socket.close();
                        return;
                    }
                }
                if ($c.isAjae === null) {
                    $c.sendError(441);
                    $c.socket.close();
                    return;
                }
                $c.refresh().then(function (ref) {
                    if (ref.result == 200) {
                        DIC[$c.id] = $c;
                        DNAME[($c.profile.title || $c.profile.name).replace(/\s/g, "")] = $c.id;
                        MainDB.users.update(['_id', $c.id]).set(['server', SID]).on();

                        if (($c.guest && GLOBAL.GOOGLE_RECAPTCHA_TO_GUEST) || GLOBAL.GOOGLE_RECAPTCHA_TO_USER) {
                            $c.socket.send(JSON.stringify({
                                type: 'recaptcha',
                                siteKey: GLOBAL.GOOGLE_RECAPTCHA_SITE_KEY
                            }));
                        } else {
                            $c.passRecaptcha = true;

                            joinNewUser($c);
                        }
                    } else {
                        if (ref.result === 550) {
                            // 정지된 계정
                            $c.send('error', {
                                code: ref.result, message: ref.black
                            });
                        } else if (ref.result === 551) {
                            // 정지된 아이피
                            $c.send('error', {
                                code: ref.result, message: ref.black
                            });
                        } else {
                            $c.send('error', {
                                code: ref.result, message: ref.black
                            });
                        }

                        $c._error = ref.result;
                        $c.socket.close();
                    }
                });
            });
        });
        Server.on('error', function (err) {
            IOLog.warn("Error on ws: " + err.toString());
        });
        KKuTu.init(MainDB, DIC, ROOM, GUEST_PERMISSION, CHAN);
    };
};

function joinNewUser($c) {
    $c.send('welcome', {
        id: $c.id,
        guest: $c.guest,
        box: $c.box,
        playTime: $c.data.playTime,
        okg: $c.okgCount,
        users: KKuTu.getUserList(),
        rooms: KKuTu.getRoomList(),
        friends: $c.friends,
        admin: $c.admin,
        test: global.test,
        caj: $c._checkAjae ? true : false
    });
    narrateFriends($c.id, $c.friends, "on");
    KKuTu.publish('conn', {user: $c.getData()});

    IOLog.notice(`${$c.profile.title}(${$c.id}) 님이 게임에 입장했습니다. 접속 인원: ${Object.keys(DIC).length}명`);
}

KKuTu.onClientMessage = function ($c, msg) {
    if (!msg) return;

    if (!$c.passFingerprint2) {
        if (msg.type === 'fingerprint2') {
            $c.passFingerprint2 = true;

            logConnection($c, msg.value);
        }

        return;
    }

    if (!$c.passRecaptcha) {
        if (msg.type === 'recaptcha') {
            Recaptcha.verifyRecaptcha(msg.token, $c.socket._socket.remoteAddress, function (success) {
                if (success) {
                    $c.passRecaptcha = true;

                    joinNewUser($c);

                    processClientRequest($c, msg);
                } else {
                    IOLog.warn(`${$c.socket._socket.remoteAddress} 아이피에서 Recaptcha 인증에 실패했습니다.`);

                    $c.sendError(447);
                    $c.socket.close();
                }
            });
        }

        return;
    }

    processClientRequest($c, msg);
};

function logConnection($c, fingerprint2) {
    let channel = SID;
    let id = $c.id;
    let name = $c.profile.title;
    let ip = $c.socket.upgradeReq.connection.remoteAddress;
    let userAgent = $c.socket.upgradeReq.headers['user-agent'];

    MainDB.ConnectionLog.addLog(id, name, ip, channel, userAgent, fingerprint2);
}

function processClientRequest($c, msg) {
    var stable = true;
    var temp;
    var now = (new Date()).getTime();

    if (!msg) return;

    switch (msg.type) {
        case 'yell':
            if (!msg.value) return;
            if (!$c.admin) return;

            $c.publish('yell', {value: msg.value});
            break;
        case 'refresh':
            $c.refresh();
            break;
        case 'talk':
            if (!msg.value) return;
            if (!msg.value.substr) return;
            if (!GUEST_PERMISSION.talk) if ($c.guest) {
                $c.send('error', {code: 401});
                return;
            }
            msg.value = msg.value.substr(0, 200);
            if ($c.admin) {
                if (!processAdmin($c.id, msg.value)) break;
            }
            checkTailUser($c.id, $c.place, msg);
            if (msg.whisper) {
                msg.whisper.split(',').forEach(v => {
                    if (temp = DIC[DNAME[v]]) {
                        temp.send('chat', {
                            from: $c.profile.title || $c.profile.name,
                            profile: $c.profile,
                            value: msg.value
                        });
                    } else {
                        $c.sendError(424, v);
                    }
                });
            } else {
                if (!allowLobbyChat && $c.place == 0 && !$c.admin) $c.send('yell', {value: "로비 채팅이 일시적으로 비활성화 되었습니다."});
                else $c.chat(msg.value);
            }
            break;
        case 'friendAdd':
            if (!msg.target) return;
            if ($c.guest) return;
            if ($c.id == msg.target) return;
            if (Object.keys($c.friends).length >= 100) return $c.sendError(452);
            if (temp = DIC[msg.target]) {
                if (temp.guest) return $c.sendError(453);
                if ($c._friend) return $c.sendError(454);
                $c._friend = temp.id;
                temp.send('friendAdd', {from: $c.id});
            } else {
                $c.sendError(450);
            }
            break;
        case 'friendAddRes':
            if (!(temp = DIC[msg.from])) return;
            if (temp._friend != $c.id) return;
            if (msg.res) {
                // $c와 temp가 친구가 되었다.
                $c.addFriend(temp.id);
                temp.addFriend($c.id);
            }
            temp.send('friendAddRes', {target: $c.id, res: msg.res});
            delete temp._friend;
            break;
        case 'friendEdit':
            if (!$c.friends) return;
            if (!$c.friends[msg.id]) return;
            $c.friends[msg.id] = (msg.memo || "").slice(0, 50);
            $c.flush(false, false, true);
            $c.send('friendEdit', {friends: $c.friends});
            break;
        case 'friendRemove':
            if (!$c.friends) return;
            if (!$c.friends[msg.id]) return;
            $c.removeFriend(msg.id);
            break;
        case 'report':
            // IOLog.info("[DEBUG] Got Response: REPORT");
            if (!msg.id || !msg.reason) return;
            if (!GUEST_PERMISSION.report) if ($c.guest) return;

            const embed = new MessageBuilder()
                .setTitle('유저 신고')
                .setDescription('인게임에서 유저 신고가 접수되었습니다.')
                .setColor(14423100)
                .addField('제보자 ID', $c.id, false)
                .addField('대상 ID', msg.id, false)
                .addField('사유', msg.reason, false)
                .setTimestamp();

            reportDiscordWebHook.send(embed).then(() => {
                $c.send('yell', {value: "끄투리오에 신고가 정상 접수되었습니다."});
                IOLog.notice(`${$c.profile.title}(${$c.id}) 님이 ${msg.id} 님을 "${msg.reason}" 사유로 신고했습니다.`);
            }).catch(err => {
                IOLog.error(`신고 내용을 디스코드 웹훅으로 전송하는 중 오류가 발생했습니다. ${err.message}`);
            });
            break;
        case 'enter':
        case 'setRoom':
            if (!msg.title) stable = false;
            if (!msg.limit) stable = false;
            if (!msg.round) stable = false;
            if (!msg.time) stable = false;
            if (!msg.opts) stable = false;

            msg.code = false;
            msg.limit = Number(msg.limit);
            msg.mode = Number(msg.mode);
            msg.round = Number(msg.round);
            msg.time = Number(msg.time);

            if (isNaN(msg.limit)) stable = false;
            if (isNaN(msg.mode)) stable = false;
            if (isNaN(msg.round)) stable = false;
            if (isNaN(msg.time)) stable = false;

            if (stable) {
                if (msg.title.length > 20) stable = false;
                if (msg.password.length > 20) stable = false;
                if (msg.limit < 2 || msg.limit > 8) {
                    msg.code = 432;
                    stable = false;
                }
                if (msg.mode < 0 || msg.mode >= MODE_LENGTH) stable = false;
                if (msg.round < 1 || msg.round > 10) {
                    msg.code = 433;
                    stable = false;
                }
                if (ENABLE_ROUND_TIME.indexOf(msg.time) == -1) stable = false;
            }
            if (msg.type == 'enter') {
                if (msg.id || stable) $c.enter(msg, msg.spectate);
                else $c.sendError(msg.code || 431);
            } else if (msg.type == 'setRoom') {
                if (stable) $c.setRoom(msg);
                else $c.sendError(msg.code || 431);
            }
            break;
        case 'inviteRes':
            if (!(temp = ROOM[msg.from])) return;
            if (!GUEST_PERMISSION.inviteRes) if ($c.guest) return;
            if ($c._invited != msg.from) return;
            if (msg.res) {
                $c.enter({id: $c._invited}, false, true);
            } else {
                if (DIC[temp.master]) DIC[temp.master].send('inviteNo', {target: $c.id});
            }
            delete $c._invited;
            break;
        /* 망할 셧다운제
        case 'caj':
            if(!$c._checkAjae) return;
            clearTimeout($c._checkAjae);
            if(msg.answer == "yes") $c.confirmAjae(msg.input);
            else if(KKuTu.NIGHT){
                $c.sendError(440);
                $c.socket.close();
            }
            break;
        */
        case 'test':
            checkTailUser($c.id, $c.place, msg);
            break;
        case 'nickChange':
            if ($c.guest) return;
            UserNickChange.processUserNickChange($c, msg.value, function (code) {
                $c.sendError(code);
            });
            break;
        case 'suspicion':
            const action = msg.action;
            const isGuest = $c.guest;
            const name = $c.profile.title || $c.profile.name;
            const id = $c.id;
            const ip = $c.socket.upgradeReq.connection.remoteAddress.slice(7);
            const userAgent = $c.socket.upgradeReq.headers['user-agent'] || '';
            const intervalInputHistory = msg.hasOwnProperty('intervalInputHistory') ? JSON.parse(msg.intervalInputHistory) : [];
            const onInputHistory = msg.hasOwnProperty('onInputHistory') ? JSON.parse(msg.onInputHistory) : [];

            const isGuestText = isGuest ? '네' : '아니요';
            let actionName = action;
            let doubt = '';

            IOLog.notice(`의심 행동을 감지했습니다! (${action}) - 손님: ${isGuestText} / 닉네임: ${name} / UserID: ${id} / 아이피: ${ip}`)

            writeSuspicionLogToFile(id, intervalInputHistory, onInputHistory, (file) => {
                if (action === 'HiddenInput') {
                    actionName = '숨겨진 input 영역에 글 입력';
                    doubt = '높음';

                    const inputId = msg.hasOwnProperty('inputId') ? msg.inputId : 'BAD_REQ';
                    const inputVal = msg.hasOwnProperty('inputVal') ? msg.inputVal : 'BAD_REQ';

                    const suspicionEmbed = new MessageBuilder()
                        .setTitle('의심 행동 감지')
                        .setDescription('의심 행동이 감지되었습니다.')
                        .setColor(14423100)
                        .addField('시간', formatTime(new Date()), false)
                        .addField('행동', actionName, false)
                        .addField('의심도', doubt, false)
                        .addField('손님', isGuestText, true)
                        .addField('닉네임', name, true)
                        .addField('UserID', id, true)
                        .addField('아이피', ip, true)
                        .addField('inputId', inputId, true)
                        .addField('inputVal', inputVal, true)
                        .addField('UserAgent', userAgent, true)
                        .setFooter('세부 정보는 첨부된 파일을 확인해주세요.')
                        .setTimestamp();

                    suspicionOtherDiscordWebHook.send(suspicionEmbed).then(() => {
                        IOLog.info('의심 행동을 디스코드 웹훅으로 전송했습니다.');
                    }).catch(err => {
                        IOLog.error(`의심 행동을 디스코드 웹훅으로 전송하는 중 오류가 발생했습니다. ${err.message}`);
                    });

                    $c.socket.close();
                } else if (action === 'ModulationEvent') {
                    actionName = '이벤트 변조';
                    doubt = '세부 내용 검토 필요';

                    const type = msg.hasOwnProperty('type') ? msg.modulationType : 'BAD_REQ';
                    const events = msg.hasOwnProperty('events') ? msg.events : 'BAD_REQ';

                    let typeName = '';
                    if (type === 1) typeName = '모든 이벤트가 등록되지 않음';
                    else if (type === 2) typeName = 'paste 이벤트가 등록 해제됨';
                    else if (type === 3) typeName = 'paste 이벤트가 비어있음';
                    else if (type === 4) typeName = 'paste 이벤트가 존재하나 무결성이 검증되지 않음';

                    const suspicionEmbed = new MessageBuilder()
                        .setTitle('의심 행동 감지')
                        .setDescription('의심 행동이 감지되었습니다.')
                        .setColor(14423100)
                        .addField('시간', formatTime(new Date()), false)
                        .addField('행동', actionName, false)
                        .addField('의심도', doubt, false)
                        .addField('손님', isGuestText, true)
                        .addField('닉네임', name, true)
                        .addField('UserID', id, true)
                        .addField('아이피', ip, true)
                        .addField('유형', typeName, true)
                        .addField('UserAgent', userAgent, true)
                        .setFooter('세부 정보는 첨부된 파일을 확인해주세요.')
                        .setTimestamp();

                    writeEtcInfoToFile(id, 'event', events ? events : '없음', (etcFile) => {
                        IOLog.info('document 이벤트 객체 정보 파일을 디스코드로 업로드하는 중입니다...');
                        suspicionOtherDiscordWebHook.sendFile(etcFile).then(() => {
                            IOLog.info('document 이벤트 객체 정보 파일 업로드가 완료되었습니다.');
                        })
                    })

                    suspicionOtherDiscordWebHook.send(suspicionEmbed).then(() => {
                        IOLog.info('의심 행동을 디스코드 웹훅으로 전송했습니다.');
                    }).catch(err => {
                        IOLog.error(`의심 행동을 디스코드 웹훅으로 전송하는 중 오류가 발생했습니다. ${err.message}`);
                    });

                    $c.socket.close();
                } else if (action === 'AbnormalSpeed100ms') {
                    actionName = '0.1초 이내에 2글자 초과로 입력';
                    doubt = '세부 내용 검토 필요';

                    const suspicionEmbed = new MessageBuilder()
                        .setTitle('의심 행동 감지')
                        .setDescription('의심 행동이 감지되었습니다.')
                        .setColor(14423100)
                        .addField('시간', formatTime(new Date()), false)
                        .addField('행동', actionName, false)
                        .addField('의심도', doubt, false)
                        .addField('손님', isGuestText, true)
                        .addField('닉네임', name, true)
                        .addField('UserID', id, true)
                        .addField('아이피', ip, true)
                        .addField('UserAgent', userAgent, true)
                        .setFooter('세부 정보는 첨부된 파일을 확인해주세요.')
                        .setTimestamp();

                    suspicion100MsDiscordWebHook.send(suspicionEmbed).then(() => {
                        IOLog.info('의심 행동을 디스코드 웹훅으로 전송했습니다.');
                    }).catch(err => {
                        IOLog.error(`의심 행동을 디스코드 웹훅으로 전송하는 중 오류가 발생했습니다. ${err.message}`);
                    });
                }
            })

            break;
        default:
            break;
    }
}

function writeSuspicionLogToFile(id, intervalInputHistory, onInputHistory, callback) {
    const time = moment().format('YYYY-MM-DD HH.mm.ss')
    const file = `./suspicions/${id}-${time}.txt`;

    let text = id + ' 사용자 의심 행동에 대한 기록입니다.\n' +
        '아래 데이터는 사용자의 브라우저에서 기록되고, 전송되는 정보입니다.\n' +
        '가능성은 낮곘지만, 정보를 100% 신뢰해서는 안됩니다.\n' +
        '\n' +
        '\n' +
        '[0.1초 간격 결과값 기록]\n';
    intervalInputHistory.forEach(history => {
        text += `${history}\n`;
    });

    text += '\n\n' +
        '[실시간 입력 기록]\n' +
        '사용자 시간 | 입력 유형 | 입력한 값 | 입력 완료 후 결과 값\n';
    onInputHistory.forEach(history => {
        text += `${history.time} | ${history.type} | ${history.data} | ${history.result}\n`;
    });

    File.writeFile(file, text, () => {
        callback(file);
    });
}

function writeEtcInfoToFile(id, suffix, text, callback) {
    const time = moment().format('YYYY-MM-DD HH.mm.ss')
    const file = `./suspicions/${id}-${time}-${suffix}.txt`;

    File.writeFile(file, text, () => {
        callback(file);
    });
}

function formatTime(time) {
    const timezoneOffset = new Date().getTimezoneOffset() * 60000;
    const timezoneTime = new Date(time - timezoneOffset);

    return timezoneTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

KKuTu.onClientClosed = function ($c, code) {
    delete DIC[$c.id];
    if ($c._error != 409) MainDB.users.update(['_id', $c.id]).set(['server', ""]).on();
    if ($c.profile) delete DNAME[$c.profile.title || $c.profile.name];
    if ($c.socket) $c.socket.removeAllListeners();
    if ($c.friends) narrateFriends($c.id, $c.friends, "off");
    KKuTu.publish('disconn', {id: $c.id});

    IOLog.notice(`${$c.profile.title}(${$c.id}) 님이 게임에서 퇴장했습니다. 접속 인원: ${Object.keys(DIC).length}명`);
};
