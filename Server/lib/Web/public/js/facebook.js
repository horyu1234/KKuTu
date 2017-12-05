window.fbAsyncInit = function () {
    FB.init({
        appId: 'FACEBOOK_APP_ID',
        xfbml: true,
        version: 'v2.8'
    });
    if (document.getElementById("facebook-menu")) {
        document.getElementById("facebook-menu").addEventListener("click", function () {
            FB.ui({
                    method: 'share',
                    href: 'KKUTU_URL',
                },
                function (response) {
                    if (response && !response.error_message) {
                        console.log('Posting completed.');
                    } else {
                        console.log('Error while posting.');
                    }
                });
        });
    }
};
(function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = "//connect.facebook.net/ko_KR/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
