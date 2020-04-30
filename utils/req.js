"use strict";

require('dotenv').config()

const request = require('request-promise')

/**
 * URL для внешнего API
 * @type {*|string}
 */
const API_URL = process.env.SG_API || null


/**
 * Вспомогательная функция для использования внешних и внутренних API
 *
 * @param ctx - Контекст приложения
 * @param url - Вызываемый URL
 * @param args - Аргументы вызова
 * @returns {Promise|null} - Promise-объект запроса
 */
const make = async (ctx, url, args = {}) => {
    if (API_URL === null) {
        console.error('🚫  SharedGoals API URL is not defined. Set SG_API env-variable to fix this.')
        return null
    }
    return new Promise((resolve, reject) => {
        let user = null
        
        // Если определен контекст приложения - ищем там данные пользователя
        if (ctx && typeof ctx !== 'undefined') {
            const stateField = args.state_field || 'state'
            
            // Ищем данные пользователя в поле состояния, определяемом default- или указанной переменной
            if (ctx[stateField] && ctx[stateField].user) {
                user = ctx[stateField].user
            }
        }
        
        // Определяем авторизационный токен из объекта пользователя
        const token = user && (user.token || user.get('token')) || null
        
        // Если url не начинается со слэша - добавляем
        if (!url.match(/^\//)) {
            url = '/' + url
        }

        // Формируем опции запроса
        let opt = {
            headers: token ? { 'Authorization': 'Bearer ' + token } : null,
            rejectUnauthorized: false,
            method: args.method || 'POST',
            url: `${process.env.SG_API}${url}`,
            form: args
        }

        // Логируем параметры запросы
        if (process.env.LOG === 'on') {
            console.log(url + ' ' + JSON.stringify(opt))
        }

        // Осуществляем запрос
        request(opt, (error, response, body) => {
            if (!error) {
                let responseJSON = null
                try {
                    responseJSON = JSON.parse(body)
                } catch (err) {
                    console.error(ctx, err)
                }
                if (responseJSON !== null) {
                    if (!responseJSON.hasOwnProperty('error')) {
                        resolve(responseJSON)
                    } else {
                        reject(responseJSON)
                    }
                }
            } else {
                reject(error)
            }
        }).catch(e => reject)
    })
}

module.exports.make = make;