"use strict";

require('dotenv').config()

const request = require('request-promise')

/**
 * URL для внешнего API
 * @type {*|string}
 */
const API_URL = process.env.SG_API || null

/**
 * Bearer-токен для авторизации запросов
 * @type {string|null}
 */
let SESSION_TOKEN = null

/**
 * Объект юзера сессии
 * @type {{}|null}
 */
let SESSION_USER = null


/**
 * Устанавливает токен авторизации
 *
 * @param token - Токен
 */
const setSessionToken = (token) => {
    SESSION_TOKEN = token
}

module.exports.setSessionToken = setSessionToken;

/**
 * Устанавливает объект пользователя
 *
 * @param user - Объект пользователя
 */
const setSessionUser = (user) => {
    SESSION_USER = user
}

module.exports.setSessionUser = setSessionUser;

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

    return new Promise( async (resolve, reject) => {
        let user = SESSION_USER
        
        // Если определен контекст приложения - ищем там данные пользователя
        if (ctx && typeof ctx !== 'undefined') {
            const sessionField = args.session_field || 'session'
            
            // Ищем данные пользователя в поле состояния, определяемом default- или указанной переменной
            if (ctx[sessionField] && ctx[sessionField].user) {
                user = ctx[sessionField].user
            }
        }
        
        // Определяем авторизационный токен из объекта пользователя
        const token = SESSION_TOKEN || (user && (user.token || user.get('token')))
        
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
                    console.error('body: ', body)
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