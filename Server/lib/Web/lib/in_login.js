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

(function () {
    $(document).ready(function () {
        $(".with-naver").on('click', function (e) {
            var url = "https://nid.naver.com/oauth2.0/authorize?";
            url += "response_type=code&";
            url += "client_id=NAVER_CLIENT_ID&";
            url += "state=" + encodeURI($("#stateKey").html()) + "&";
            url += "redirect_uri=" + encodeURI("http:///kkutu.cc/?authType=naver");
            location.href = url;
        });
        $(".with-facebook").on('click', function (e) {
            var url = "https://www.facebook.com/dialog/oauth?";
            url += "client_id=FACEBOOK_APP_ID&";
            url += "redirect_uri=" + encodeURI('http:///kkutu.cc/?authType=facebook') + "&";
            url += "scope=user_birthday";
            location.href = url;
        });
        $(".with-google").on('click', function (e) {
            var url = "https://accounts.google.com/o/oauth2/auth?";
            url += "client_id=GOOGLE_CLIENT_ID&";
            url += "response_type=code&";
            url += "scope=profile+email&";
            url += "redirect_uri=" + encodeURI('http:///kkutu.cc/?authType=google');
            location.href = url;
        });
    });
})();