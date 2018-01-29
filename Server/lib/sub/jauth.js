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

const NAVER_ID = "NAVER_CLIENT_ID";
const NAVER_SECRET = "NAVER_CLIENT_SECRET";
const FACEBOOK_ID = "FACEBOOK_APP_ID";
const FACEBOOK_SECRET = "FACEBOOK_APP_SECRET";
const GOOGLE_ID = "GOOGLE_CLIENT_ID";
const GOOGLE_SECRET = "GOOGLE_CLIENT_SECRET";
// const TWITTER_KEY = "";

var Web = require("request");
var Lizard = require("../sub/lizard");
var JLog = require("../sub/jjlog");
// var Ajae	 = require("../sub/ajae").checkAjae;

exports.login = function (type, token, sid) {
    var R = new Lizard.Tail();
    var now = new Date();
    var MONTH = now.getMonth() + 1, DATE = now.getDate();
    var $p = {};

    if (type == "naver") {
        Web.post("https://nid.naver.com/oauth2.0/token", {
            form: {
                grant_type: "authorization_code",
                client_id: NAVER_ID,
                client_secret: NAVER_SECRET,
                code: token,
                state: sid
            }
        }, function (err, res, doc) {
            if (err) {
                JLog.warn("Error on oAuth-naver: " + err.toString());
                R.go({error: 500});
            } else {
                try {
                    doc = JSON.parse(doc);
                } catch (e) {
                    return R.go({error: 500});
                }

                $p.token = doc.access_token;
                Web.post({
                    url: "https://openapi.naver.com/v1/nid/me",
                    headers: {'Authorization': "Bearer " + $p.token}
                }, function (err, res, doc) {
                    if (err) return R.go({error: 400});
                    if (!doc) return R.go({error: 500});
                    try {
                        doc = JSON.parse(doc);
                    } catch (e) {
                        return R.go({error: 500});
                    }

                    if (doc.resultcode == "00") {
                        $p.type = "naver";
                        $p.id = doc.response.id;
                        $p.name = doc.response.name;
                        $p.title = doc.response.nickname;
                        $p.image = doc.response.profile_image;
                        // 망할 셧다운제
                        // $p._age = doc.response.age.split('-').map(Number);
                        // $p._age = {min: ($p._age[0] || 0) - 1, max: $p._age[1] - 1};
                        // $p.birth = doc.response.birthday.split('-').map(Number);
                        // if (MONTH < $p.birth[0] || (MONTH == $p.birth[0] && DATE < $p.birth[1])) {
                        //     $p._age.min--;
                        //     $p._age.max--;
                        // }
                        // $p.isAjae = Ajae($p.birth, $p._age);
                        // $p.sex = doc.response[0].gender[0];
                        R.go($p);
                    } else {
                        R.go({error: 401});
                    }
                });
            }
        });
    } else if (type == "facebook") {
        Web.get({
            url: "https://graph.facebook.com/v2.4/oauth/access_token",
            qs: {
                client_id: FACEBOOK_ID,
                redirect_uri: "http://kkutu.cc/?authType=facebook",
                client_secret: FACEBOOK_SECRET,
                code: token
            }
        }, function (err, res, doc) {
            if (err) {
                JLog.warn("Error on oAuth-facebook: " + err.toString());
                R.go({error: 500});
            } else {
                try {
                    doc = JSON.parse(doc);
                } catch (e) {
                    return R.go({error: 500});
                }

                $p.token = doc.access_token;
                Web.get({
                    url: "https://graph.facebook.com/v2.4/me",
                    qs: {
                        access_token: $p.token,
                        fields: "id,name,gender"
                    }
                }, function (err, res, doc) {
                    if (err) return R.go({error: 400});
                    if (!doc) return R.go({error: 500});
                    try {
                        doc = JSON.parse(doc);
                    } catch (e) {
                        return R.go({error: 500});
                    }

                    if (!doc.error) {
                        $p.type = "facebook";
                        $p.id = doc.id;
                        $p.name = doc.name;
                        $p.image = "https://graph.facebook.com/" + doc.id + "/picture?type=large";
                        // 망할 셧다운제
                        //  $p._age = doc.age_range;
                        //  if (doc.birthday) {
                        //      $p.birth = doc.birthday.split('/').map(Number);
                        //  }
                        //  $p.isAjae = Ajae($p.birth, $p._age);
                        // $p.sex = doc.gender[0].toUpperCase();
                        R.go($p);
                    } else {
                        R.go({error: 401});
                    }
                });
            }
        });
    } else if (type == "google") {
        Web.post("https://www.googleapis.com/oauth2/v4/token", {
            form: {
                code: token,
                client_id: GOOGLE_ID,
                client_secret: GOOGLE_SECRET,
                redirect_uri: "http:///kkutu.cc/?authType=google",
                grant_type: "authorization_code"
            }
        }, function (err, res, doc) {
            if (err) {
                JLog.warn("Error on oAuth-google: " + err.toString());
                R.go({error: 500});
            } else {
                try {
                    doc = JSON.parse(doc);
                } catch (e) {
                    return R.go({error: 500});
                }

                $p.token = doc.id_token;
                Web.get({
                    url: "https://www.googleapis.com/oauth2/v3/tokeninfo",
                    qs: {
                        id_token: $p.token
                    }
                }, function (err, res, doc) {
                    try {
                        doc = JSON.parse(doc);
                    } catch (e) {
                        return R.go({error: 500});
                    }
                    if (doc.aud != GOOGLE_ID) return R.go({error: 401});
                    if (!doc.email_verified) return R.go({error: 402});

                    $p.type = "google";
                    $p.id = doc.sub;
                    $p.name = doc.name;
                    $p.image = doc.picture;

                    // 망할 셧다운제
                    // $p._age = doc.ageRange;
                    // if (doc.birthday) {
                    //     $p.birth = doc.birthday.split('-').map(Number);
                    //     $p.birth.push($p.birth.shift());
                    // }
                    // $p.isAjae = Ajae($p.birth, $p._age);
                    R.go($p);
                });
            }
        });
    }
    return R;
};
exports.logout = function ($p) {
    var R = new Lizard.Tail();

    if ($p.type == "naver") {
        Web.post("https://nid.naver.com/oauth2.0/token", {
            form: {
                grant_type: "delete",
                client_id: NAVER_ID,
                client_secret: NAVER_SECRET,
                code: $p.token,
                service_provider: "NAVER"
            }
        }, function (err, res, doc) {
            R.go(doc);
        });
    } else if ($p.type == "facebook") {
        R.go(true);
    } else if ($p.type == "google") {
        R.go(true);
    }
    return R;
};