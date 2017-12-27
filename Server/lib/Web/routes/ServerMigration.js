const MainDB = require("../db");

exports.run = function (Server, page) {
    Server.get("/kkutuioMigration", function (req, res) {
        if (!req.session.profile) {
            res.status(400).send('로그인이 필요합니다. 메인 페이지에서 다시 시도해주세요.');
            return;
        }

        let uid = req.session.profile.id;
        let utype = req.session.profile.type;
        MainDB.ServerMigrationProcess.getMigration(`kkutuhanguk_user_id='${uid}' AND kkutuhanguk_vendor='${utype}'`, function (rows) {
            if (rows.length !== 0) {
                // 이미 끝났는지 확인, 끝나지 않았다면 이동
                let row = rows[0];
                // if (row.finished) {
                //     res.redirect('/');
                //     return;
                // }

                res.redirect('http://kkutu.io?code=' + row.code);
            } else {
                MainDB.ServerMigrationProcess.addMigration(uid, utype, function (uniqueCode) {
                    // 새로 신청
                    res.redirect('http://kkutu.io?code=' + uniqueCode);
                });
            }
        });
    });
};