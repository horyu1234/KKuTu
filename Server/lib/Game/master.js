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
var File = require('fs');
var WebSocket = require('ws');
var https = require('https');
var request = require('request');
var Hangul = require('hangul-js')
var HTTPS_Server;
// var Heapdump = require("heapdump");
var KKuTu = require('./kkutu');
var Crypto = require("../sub/crypto");
var GLOBAL = require("../sub/global.json");
var Const = require("../const");
var JLog = require('../sub/jjlog');
var Secure = require('../sub/secure');
var Recaptcha = require('../sub/recaptcha');

var MainDB;

var Server;
var DIC = {};
var DNAME = {};
var ROOM = {};

var T_ROOM = {};
var T_USER = {};

var SID;
var WDIC = {};

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

process.on('uncaughtException', function (err) {
    var text = `:${PORT} [${new Date().toLocaleString()}] ERROR: ${err.toString()}\n${err.stack}\n`;

    File.appendFile("/jjolol/KKUTU_ERROR.log", text, function (res) {
        JLog.error(`ERROR OCCURRED ON THE MASTER!`);
        console.log(text);
    });
});

function processAdmin(id, value) {
    var cmd, temp, i, j;

    value = value.replace(/^(#\w+\s+)?(.+)/, function (v, p1, p2) {
        if (p1) cmd = p1.slice(1).trim();
        return p2;
    });
    switch (cmd) {
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
                    msg: temp.socket._socket.remoteAddress
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
                    JLog.error("Error when dumping!");
                    return JLog.error(err.toString());
                }
                if(DIC[id]) DIC[id].send('yell', { value: "DUMP OK" });
                JLog.success("Dumping success.");
            });*/
            return null;
    }
    return value;
}

function checkTailUser(id, place, msg) {
    var temp;

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

let lastChatMap = {};
/*
{
   "id": {
       "lastKey": keydown 에서 나온 거,
       "lastChat": chat 에서 나온 거,
       "keyTime": lastKey 가 입력된 시간 (부정확)
   },
   ...
}
*/

// const BETWEEN_CHAT_MINIMUM_MILLIS = 100;
const MINIMUM_CHAR_COUNT_PER_CHAT = 4;

const KEY_CODES = {
    'F12': 123,
    'Backspace': 8,
    'VK_PACKET': 231
};

function cheatDetection(id, place, msg) {
    let currentTime = Date.now();
    switch (msg.activityType) {
        case 'keydown':
            let keyCode = msg.value;
            if (!lastChatMap[id] || !lastChatMap[id].lastKey || !lastChatMap[id].keyTime) {
                if (!lastChatMap[id]) {
                    lastChatMap[id] = {};
                }

                lastChatMap[id].lastKey = keyCode;
                lastChatMap[id].keyTime = currentTime;
                break;
            }

            if (keyCode === KEY_CODES['F12']) {
                sendCheatDetectedMessage('F12(개발자 도구)를 사용하였습니다.', false);
            }

            /*
            TODO: 일반 채팅에서 한글자만 꾹 누르고 있으면 무조건 감지되는 버그가 있습니다.
            if (currentTime - lastChatMap[id].keyTime <= BETWEEN_CHAT_MINIMUM_MILLIS) {
                if (lastChatMap[id].lastKey === KEY_CODES['Backspace']) {
                    break;
                }

                sendCheatDetectedMessage(BETWEEN_CHAT_MINIMUM_MILLIS + 'ms 내에 연속적으로 입력하였습니다.', false);
            }
            */

            if (keyCode === KEY_CODES['VK_PACKET']) {
                sendCheatDetectedMessage('가상 키보드(VK_PACKET)가 감지되었습니다.', false);
            }

            lastChatMap[id].lastKey = keyCode;
            lastChatMap[id].keyTime = currentTime;
            break;
        case 'chat':
            let chatText = msg.value;
            if (!lastChatMap[id] || !lastChatMap[id].lastChat) {
                if (!lastChatMap[id]) {
                    lastChatMap[id] = {};
                }

                lastChatMap[id].lastChat = chatText;
                break;
            }

            if (chatText.includes('.macro')) {
                sendCheatDetectedMessage('배포되어 있는 특정 매크로 작동을 시도하였습니다. (' + chatText + ')', true);
            }

            if (chatText.length - lastChatMap[id].lastChat.length >= MINIMUM_CHAR_COUNT_PER_CHAT) {
                sendCheatDetectedMessage('한번에 ' + MINIMUM_CHAR_COUNT_PER_CHAT + '글자 이상을 입력하였습니다.', true);
            }

            if (chatText.length - lastChatMap[id].lastChat.length === 1 && Hangul.isComplete(chatText.slice(-1))) {
                if (Hangul.isJong(Hangul.d(chatText.slice(-1))[0]) && Hangul.endsWithConsonant(lastChatMap[id].lastChat.slice(-1))) {
                    break;
                }

                sendCheatDetectedMessage('초성을 입력하지 않고 바로 입력하였습니다.', true);
            }

            lastChatMap[id].lastChat = chatText;
            break;
        case 'keyup':
            // 주의: lastChatMap[id].lastKey 는 이미 눌렀던 키로, msg.value 와 같을 수 있음.
            break;
    }

    function sendCheatDetectedMessage(detectTypeText, hasBetweenTime) {
        let message = createDetectedMessage(detectTypeText, hasBetweenTime);
        sendTelegramMessage(message);
    }

    function createDetectedMessage(detectTypeText, hasBetweenTime) {
        let currentTime = new Date();
        let formattedDate = currentTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');

        let detail;
        if (hasBetweenTime) {
            let betweenTime = currentTime - lastChatMap[id].keyTime;
            detail = lastChatMap[id].lastKey + ' → ' + msg.value + ' (' + betweenTime + 'ms)';
        } else {
            detail = lastChatMap[id].lastChat + ' → ' + msg.value;
        }

        return '`비 인가 프로그램` 사용 의심 유저가 발견되었습니다.\n' +
            '\n' +
            '감지 정보: ' + detectTypeText + '\n' +
            '세부 내용: ' + detail + '\n' +
            '고유 번호: ' + id + '\n' +
            '방     번호: ' + (place === 0 ? '로비' : place) + '\n' +
            '감지 시간: ' + formattedDate;
    }

    function sendTelegramMessage(message) {
        let body = {
            "chat_id": -1001206450931,
            "text": message,
            "parse_mode": "markdown"
        };

        let url = 'https://api.telegram.org/' + GLOBAL.TELEGRAM_BOT_TOKEN + '/sendMessage';
        request.post(url, {body: body, json: true}, (err, res, body) => {
            if (err) {
                JLog.error(err);
            }
        })
    }
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
            cheatDetection(msg.id, msg.place, msg.msg)
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
                JLog.warn(`Wrong room-come id=${msg.id}&target=${msg.target}`);
            }
            break;
        case "room-spectate":
            if (ROOM[msg.id] && DIC[msg.target]) {
                ROOM[msg.id].spectate(DIC[msg.target], msg.pw);
            } else {
                JLog.warn(`Wrong room-spectate id=${msg.id}&target=${msg.target}`);
            }
            break;
        case "room-go":
            if (ROOM[msg.id] && DIC[msg.target]) {
                ROOM[msg.id].go(DIC[msg.target]);
            } else {
                // 나가기 말고 연결 자체가 끊겼을 때 생기는 듯 하다.
                JLog.warn(`Wrong room-go id=${msg.id}&target=${msg.target}`);
                if (ROOM[msg.id] && ROOM[msg.id].players) {
                    // 이 때 수동으로 지워준다.
                    var x = ROOM[msg.id].players.indexOf(msg.target);

                    if (x != -1) {
                        ROOM[msg.id].players.splice(x, 1);
                        JLog.warn(`^ OK`);
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
            JLog.warn(`Unhandled IPC message type: ${msg.type}`);
    }
});
exports.init = function (_SID, CHAN) {
    SID = _SID;
    MainDB = require('../Web/db');
    MainDB.ready = function () {
        JLog.success("Master DB is ready.");

        MainDB.users.update(['server', SID]).set(['server', ""]).on();
        if (Const.IS_SECURED) {
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
        Server.on('connection', function (socket) {
            var key;
            // 토큰 복호화
            if (socket.upgradeReq.headers.host.match(/^127\.0\.0\.2:/)) {
                key = socket.upgradeReq.url.slice(1);
            } else {
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
                JLog.warn("Error on #" + key + " on ws: " + err.toString());
            });
            // 웹 서버
            if (socket.upgradeReq.headers.host.match(/^127\.0\.0\.2:/)) {
                if (WDIC[key]) WDIC[key].socket.close();
                WDIC[key] = new KKuTu.WebServer(socket);
                JLog.info(`New web server #${key}`);
                WDIC[key].socket.on('close', function () {
                    JLog.alert(`Exit web server #${key}`);
                    WDIC[key].socket.removeAllListeners();
                    delete WDIC[key];
                });
                return;
            }
            if (Object.keys(DIC).length >= Const.KKUTU_MAX) {
                socket.send(`{ "type": "error", "code": "full" }`);
                return;
            }
            MainDB.session.findOne(['_id', key]).limit(['profile', true]).on(function ($body) {
                $c = new KKuTu.Client(socket, $body ? $body.profile : null, key);
                $c.admin = GLOBAL.ADMIN.indexOf($c.id) != -1;

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
                    if (SID !== "0" && SID !== "1" && SID !== "2") {
                        $c.sendError(402);
                        $c.socket.close();
                        return;
                    }
                    if (KKuTu.NIGHT) {
                        $c.sendError(440);
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

                        logConnection($c);

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
                        $c.send('error', {
                            code: ref.result, message: ref.black
                        });
                        $c._error = ref.result;
                        $c.socket.close();
                        // JLog.info("Black user #" + $c.id);
                    }
                });
            });
        });
        Server.on('error', function (err) {
            JLog.warn("Error on ws: " + err.toString());
        });
        KKuTu.init(MainDB, DIC, ROOM, GUEST_PERMISSION, CHAN);
    };

    function logConnection($c) {
        let id = $c.id;
        let name = KKuTu.getUserList()[id].profile.title;
        let ip = $c.socket._socket.remoteAddress;
        let channel = SID;
        let userAgent = $c.socket.upgradeReq.headers['user-agent'];

        MainDB.ConnectionLog.addLog(id, name, ip, channel, userAgent);
    }
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

    JLog.info("New user #" + $c.id);
}

KKuTu.onClientMessage = function ($c, msg) {
    if (!msg) return;

    if ($c.passRecaptcha) {
        processClientRequest($c, msg);
    } else {
        if (msg.type === 'recaptcha') {
            Recaptcha.verifyRecaptcha(msg.token, $c.socket._socket.remoteAddress, function (success) {
                if (success) {
                    $c.passRecaptcha = true;

                    joinNewUser($c);

                    processClientRequest($c, msg);
                } else {
                    JLog.warn(`Recaptcha failed from IP ${$c.socket._socket.remoteAddress}`);

                    $c.sendError(447);
                    $c.socket.close();
                }
            });
        }
    }
};

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
            cheatDetection($c.id, $c.place, msg)
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
                $c.chat(msg.value);
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
        case 'chat-activity':
            cheatDetection($c.id, $c.place, msg);
            break;
        default:
            break;
    }
}

KKuTu.onClientClosed = function ($c, code) {
    delete DIC[$c.id];
    if ($c._error != 409) MainDB.users.update(['_id', $c.id]).set(['server', ""]).on();
    if ($c.profile) delete DNAME[$c.profile.title || $c.profile.name];
    if ($c.socket) $c.socket.removeAllListeners();
    if ($c.friends) narrateFriends($c.id, $c.friends, "off");
    KKuTu.publish('disconn', {id: $c.id});

    JLog.alert("Exit #" + $c.id);
};