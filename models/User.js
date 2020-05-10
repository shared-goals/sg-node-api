"use strict";

const req = require('../utils/req')

/**
 * Класс текущего пользователя
 * @constructor
 */
function User (data) {
    let self = this
    data = data || {}
    
    /**
     * Атрибуты модели
     * @type {{id: null, createdAt: null, updatedAt: null, language: string, username: string, email: string, password: string, name: string, telegram_id: null}}
     */
    self.attributes = {
        id: null,
        createdAt: null,
        updatedAt: null,
        language: 'ru',
        username: '',
        email: '',
        password: '',
        name: '',
        telegram_id: null
    }
    
    /**
     * Задает значения одному или нескольким указанным полям
     *
     * @param data - Объект ключей и их значений
     * @returns {Goal}
     */
    self.set = (data) => {
        self.attributes = Object.assign({}, self.attributes, data)
        return self
    }
    
    /**
     * Возвращает значение одного указанного поля в заданном виде или объект из значений по массиву указанных ключей
     *
     * @param keys - Строка ключа или массив ключей
     * @returns {*}
     */
    self.get = (keys) => {
        return keys && typeof keys !== 'undefined'
            ? (typeof keys === 'string'
                ? self.attributes[keys]
                : keys.reduce((obj, key) => ({ ...obj, [key]: self.attributes[key] }), {})
            )
            : self.attributes
    }
    
    /**
     * Сериализует экземпляр класса в JSON-объект
     *
     * @returns {string}
     */
    self.toJSON = () => {
        return JSON.stringify(self.attributes)
    }
    
    /**
     * Прповеряет заданный токен на валидность и актуальность
     *
     * @param ctx - Контекст приложения
     * @param token - Токен для проверки
     * @returns {Promise.<TResult>}
     */
    self.checkAuth = async (ctx, token) => {
        // Отправляем запрос на получение информации о токене
        return await req.make(ctx, '/check', {
            token: token,
            method: 'POST'
        }).then(response => response)
        .catch(reason => {
            console.error(reason)
            return reason
        })
    }
    
    /**
     * Добавляет провайдер авторизации в запись пользователя
     *
     * @param ctx - Контекст приложения
     * @param token - Токен для проверки
     * @returns {Promise.<TResult>}
     */
    self.addUserProvider = async (ctx, data) => {
        // Отправляем запрос на получение информации о токене
        if (data.id) {
            data.id = parseInt(data.id, 10)
        }
        self.get('auth').push(data)
        return await req.make(ctx, '/users/' + self.get('id'), {
            method: 'PUT',
            auth: self.get('auth')
        })
        .then(response => response)
        .catch(reason => {
            console.error(reason)
            return reason
        })
    }
    
    /**
     * Возвращает массив всех пользователей
     *
     * @param ctx - Контекст приложения
     * @returns {Promise.<TResult>}
     */
    self.findAll = async (ctx) => {
        return await req.make(ctx, '/users', {
            method: 'GET'
        }).then( async (response) => {
            let users = []
            if (!response || response.length === 0) {
                console.error(ctx, 'Нет пользователей')
                return null
            } else {
                for (let i = 0; i < response.length; i++) {
                    users.push((new User()).set(response[i]))
                }
            }
            return users
        }).catch( reason => {
            console.error(reason)
            return null
        })
    }
    
    /**
     * Возвращает объект пользователя по идентификатору
     *
     * @param ctx - Контекст приложения
     * @param id - Идентификатор пользователя
     * @returns {Promise.<User>}
     */
    self.findById = async (ctx, id) => {
        const ret = await req.make(ctx, '/users/' + id, {
            method: 'GET'
        }).then( response => {
            self.set(response)
            return true
        }).catch( reason => {
            console.error(reason)
            return false
        })
    
        return ret ? self : null
    }
    
    /**
     * Возвращает объект пользователя по идентификатору
     *
     * @param ctx - Контекст приложения
     * @param email - Email пользователя
     * @returns {Promise.<User>}
     */
    self.findByEmail = async (ctx, email) => {
        const ret = await req.make(ctx, '/users/email/' + encodeURIComponent(email), {
            method: 'GET'
        }).then( response => {
            self.set(response)
            return true
        }).catch( reason => {
            console.error(reason)
            return false
        })
        
        return ret ? self : null
    }
    
    /**
     * Регистрирует пользователя по переданным данным
     *
     * @param ctx - Контекст приложения
     * @returns {Promise.<*>}
     */
    self.register = async (ctx) => {
        return await req.make(ctx, '/register/', Object.assign({
            provider: 'local'
        }, self.get(), {
            method: 'POST'
        })).then( response => {
            if (response.success === true) {
                return self.set(response)
            } else {
                return response
            }
        }).catch( reason => {
            console.error(reason)
            return reason
        })
    }
    
    /**
     * Обновляет в сессии токен пользователя
     *
     * @param ctx - Контекст приложения
     * @returns {Promise.<*>}
     */
    self.refreshToken = async (ctx) => {
        const auth = await req.make(ctx, '/refresh_token/', {
            method: 'POST'
        })
        .then( response => response)
        .catch( response => {
            console.error('Сессия не обновлена, ошибка: ', response.message)
            return response
        })
        if (auth.token) {
            console.log('Сессия обновлена, инфо:')
            console.log(ctx.session.passport.user)
            ctx.session.passport.user = ctx.session.user.set({token: auth.token}).get()
            return { success: true }
        } else {
            return Object.assign({ success: false }, auth )
        }
    }
    
    // Устанавливаем переданные в конструктор опции
    self.set(data)
    
    return self
}

console.log('🔸️  User model initiated')

module.exports = User;
