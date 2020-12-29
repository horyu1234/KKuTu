/**
 * Created by kdhkr on 2020-12-29.
 */
const JLog = require('./jjlog')
const DB = require('../Web/db')

const nickConf = require('./nick.json')

const pattern = RegExp(nickConf.pattern['pattern'], nickConf.pattern['flags']['pattern'])
const bad = RegExp(nickConf.pattern['bad'], nickConf.pattern['flags']['bad'])
const black = RegExp(nickConf.pattern['black'], nickConf.pattern['flags']['black'])
const sPattern = RegExp(nickConf.pattern['similarity'], nickConf.pattern['flags']['similarity'])

const nickMin = nickConf.nick['min']
const nickMax = nickConf.nick['max']

const term = nickConf.nick['term'] * 24 * 60 * 60 * 1000

function processUserNickChange(userId, userNick, callback) {
    if (!userId || !userNick) {
        callback(400)
        return
    }

    const length = userNick.length
    if (length < nickMin || length > nickMax || length == 0) {
        callback(600)
        return
    }
    if (!userNick.match(pattern)) {
        callback(601)
        return
    }

    if (userNick.match(bad)) {
        callback(602)
        return
    }

    if (userNick.match(black)) {
        callback(603)
        return
    }

    DB.users.findOne(['_id', userId]).on(function($body) {
        const currentNick = $body.nickname
        const meanableNick = userNick.replace(sPattern, '')

        const date = Date.now()

        if (!!$body.isLimitModifyNick) {
            callback(610)
            return
        }

        if (!!$body.lastModifiedNickAt && !checkUserNickChangeTime($body.lastModifiedNickAt)) {
            callback(611)
            return
        }
        
        DB.users.findOne(['meanableNick', meanableNick]).on(function($body) {
            if ($body) {
                callback(620)
                return
            }
        })

        DB.users.update(['_id', userId]).set({ 'nickname': userNick }).on()
        DB.users.update(['_id', userId]).set({ 'meanableNick': meanableNick }).on()
        DB.users.update(['_id', userId]).set({ 'lastModifiedNickAt': date }).on()

        JLog.info(`[NICK] ${userId}님이 닉네임을 변경하였습니다. 기존: ${currentNick} / 신규: ${userNick}`)

        callback(630)
    })
    return null
}

function checkUserNickChangeTime(nickChangeTime) {
    if (nickChangeTime !== undefined) return
    if (isNaN(parseInt(nickChangeTime))) return
    if (nickChangeTime + term > Date.now()) return
    
    return true
}

exports.processUserNickChange = processUserNickChange