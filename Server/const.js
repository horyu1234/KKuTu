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

const GLOBAL = require("./sub/global.json");

exports.KKUTU_CLASSIC_COUNT = 0;
exports.KKUTU_MAX = 400;
exports.MAIN_PORTS = GLOBAL.MAIN_PORTS;
exports.TEST_PORT = 4040;
exports.CHAT_SPAM_ADD_DELAY = 2500;   //이 시간보다 빨리 치면 도배 카운트 증가
exports.CHAT_SPAM_CLEAR_DELAY = 7500; //이 시간 이후 치면 도배 카운트 초기화
exports.CHAT_SPAM_LIMIT = 4;          //이 횟수 이상 도배 카운트 올라가면 차단
exports.CHAT_BLOCKED_LENGTH = 10000;  //차단됐을 시 이 시간 이후 치면 차단 해제
exports.CHAT_KICK_BY_SPAM = 9;        //차단됐을 시 이 횟수 이상 치면 킥
exports.SPAM_CLEAR_DELAY = 1600;
exports.SPAM_ADD_DELAY = 750;
exports.SPAM_LIMIT = 7;
exports.BLOCKED_LENGTH = 10000;
exports.KICK_BY_SPAM = 9;
exports.MAX_OBSERVER = 4;
exports.TESTER = GLOBAL.ADMIN.concat([
    "Input tester id here"
]);
exports.WEBHOOK_URI = GLOBAL.WEBHOOK_URI;
exports.IS_WS_SECURED = GLOBAL.IS_WS_SECURED;
exports.WS_SSL_OPTIONS = GLOBAL.WS_SSL_OPTIONS;
exports.OPTIONS = {
    'man': {name: "Manner"},
    'saf': {name: "Safe"},
    'ext': {name: "Injeong"},
    'mis': {name: "Mission"},
    'loa': {name: "Loanword"},
    'prv': {name: "Proverb"},
    'str': {name: "Strict"},
    'k32': {name: "Sami"},
    'no2': {name: "No2"},
    'beg': {name: "OnlyBeginner"},
    'nog': {name: "NoGuest"}
};
exports.RULE = {
    /*
        유형: { lang: 언어,
            rule: 이름,
            opts: [ 추가 규칙 ],
            time: 시간 상수,
            ai: AI 가능?,
            big: 큰 화면?,
            ewq: 현재 턴 나가면 라운드 종료?
        }
    */
    'EKT': {// 영어 끄투
        lang: "en",
        rule: "Classic",
        opts: ["man", "saf", "ext", "mis", "beg", "nog"],
        time: 1,
        ai: true,
        big: false,
        ewq: true
    },
    'ESH': {// 영어 끝말잇기
        lang: "en",
        rule: "Classic",
        opts: ["ext", "mis", "beg", "nog"],
        time: 1,
        ai: true,
        big: false,
        ewq: true
    },
    'KKT': {// 한국어 쿵쿵따
        lang: "ko",
        rule: "Classic",
        opts: ["man", "saf", "ext", "mis", "loa", "str", "k32", "beg", "nog"],
        time: 1,
        ai: true,
        big: false,
        ewq: true
    },
    'KSH': {// 한국어 끝말잇기
        lang: "ko",
        rule: "Classic",
        opts: ["man", "saf", "ext", "mis", "loa", "str", "beg", "nog"],
        time: 1,
        ai: true,
        big: false,
        ewq: true
    },
    'CSQ': {// 자음 퀴즈
        lang: "ko",
        rule: "Jaqwi",
        opts: ["ijp", "beg", "nog"],
        time: 1,
        ai: true,
        big: false,
        ewq: false
    },
    'KCW': {// 한국어 십자말풀이
        lang: "ko",
        rule: "Crossword",
        opts: ["beg", "nog"],
        time: 2,
        ai: false,
        big: true,
        ewq: false
    },
    'KTY': {// 한국어 타자 대결
        lang: "ko",
        rule: "Typing",
        opts: ["prv", "beg", "nog"],
        time: 1,
        ai: false,
        big: false,
        ewq: false
    },
    'ETY': {// 영어 타자 대결
        lang: "en",
        rule: "Typing",
        opts: ["prv", "beg", "nog"],
        time: 1,
        ai: false,
        big: false,
        ewq: false
    },
    'KAP': {// 한국어 앞말잇기
        lang: "ko",
        rule: "Classic",
        opts: ["man", "saf", "ext", "mis", "loa", "str", "beg", "nog"],
        time: 1,
        ai: true,
        big: false,
        _back: true,
        ewq: true
    },
    'HUN': {// 훈민정음
        lang: "ko",
        rule: "Hunmin",
        opts: ["ext", "mis", "loa", "str", "beg", "nog"],
        time: 1,
        ai: true,
        big: false,
        ewq: true
    },
    'KDA': {// 한국어 단어 대결
        lang: "ko",
        rule: "Daneo",
        opts: ["ijp", "mis", "beg", "nog"],
        time: 1,
        ai: true,
        big: false,
        ewq: true
    },
    'EDA': {// 영어 단어 대결
        lang: "en",
        rule: "Daneo",
        opts: ["ijp", "mis", "beg", "nog"],
        time: 1,
        ai: true,
        big: false,
        ewq: true
    },
    'KSS': {// 한국어 솎솎
        lang: "ko",
        rule: "Sock",
        opts: ["no2", "beg", "nog"],
        time: 1,
        ai: false,
        big: true,
        ewq: false
    },
    'ESS': {// 영어 솎솎
        lang: "en",
        rule: "Sock",
        opts: ["no2", "beg", "nog"],
        time: 1,
        ai: false,
        big: true,
        ewq: false
    }
};
exports.getPreScore = function (text, chain, tr) {
    return 2 * (Math.pow(5 + 7 * (text || "").length, 0.74) + 0.88 * (chain || []).length) * (0.5 + 0.5 * tr);
};
exports.getPenalty = function (chain, score) {
    return -1 * Math.round(Math.min(10 + (chain || []).length * 2.1 + score * 0.15, score));
};
exports.GAME_TYPE = Object.keys(exports.RULE);
exports.EXAMPLE_TITLE = {
    'ko': "가나다라마바사아자차",
    'en': "abcdefghij"
};
exports.INIT_SOUNDS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
exports.MISSION_ko = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];
exports.MISSION_en = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];

exports.KO_INJEONG = [
    "IMS", "VOC", "KRR", "KTV",
    "NSK", "KOT", "DOT", "THP", "DRR", "DGM", "RAG", "LVL",
    "LOL", "MRN", "MMM", "MAP", "MKK", "MNG",
    "MOB", "HYK", "CYP", "HRH", "STA", "OIJ",
    "KGR", "ESB", "ELW", "OIM", "OVW", "NEX", /*"WOW",*/
    "YRY", "KPO", "JLN", "JAN", "ZEL", "POK", "HAI",
    "HSS", "KMV", "HDC", "HOS", "HON"
];
exports.EN_INJEONG = [
    "LOL"
];
exports.KO_THEME = [
    "30", "40", "60", "80", "90",
    "140", "150", "160", "170", "190",
    "220", "230", "240", "270", "310",
    "320", "350", "360", "420", "430",
    "450", "490", "530", "1001"
];
exports.EN_THEME = [
    "e05", "e08", "e12", "e13", "e15",
    "e18", "e20", "e43"
];
exports.IJP_EXCEPT = [
    "OIJ"
];
exports.KO_IJP = exports.KO_INJEONG.concat(exports.KO_THEME).filter(function (item) {
    return !exports.IJP_EXCEPT.includes(item);
});
exports.EN_IJP = exports.EN_INJEONG.concat(exports.EN_THEME).filter(function (item) {
    return !exports.IJP_EXCEPT.includes(item);
});
exports.REGION = {
    'en': "en",
    'ko': "kr"
};
exports.KOR_STRICT = /(^|,)(1|INJEONG)($|,)/;
exports.KOR_GROUP = new RegExp("(,|^)(" + [
    "0", "1", "3", "7", "8", "11", "9",
    "16", "15", "17", "2", "18", "20", "26", "19",
    "INJEONG"
].join('|') + ")(,|$)");
exports.ENG_ID = /^[a-z]+$/i;
exports.KOR_FLAG = {
    LOANWORD: 1,  // 외래어
    INJEONG: 2,   // 어인정
    SPACED: 4,    // 띄어쓰기를 해야 하는 어휘
    SATURI: 8,    // 방언
    OLD: 16,      // 옛말
    MUNHWA: 32    // 문화어
};
exports.WP_REWARD = function () {
    return 10 + Math.floor(Math.random() * 91);
};
exports.getRule = function (mode) {
    return exports.RULE[exports.GAME_TYPE[mode]];
};
