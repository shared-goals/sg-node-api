"use strict";

const Base = require('./base')
const req = require('../utils/req')

/**
 * Класс текущего пользователя
 * @constructor
 */
function User (data) {
    let self = this
    
    // Вызываем конструктор базовой модели
    Base.call(this)
    
    data = data || {}
    

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
     * @param data - Данные авторизации
     * @returns {Promise.<TResult>}
     */
    self.addUserProvider = async (ctx, data) => {
        // Отправляем запрос на получение информации о токене
        if (data.id) {
            data.id = parseInt(data.id, 10)
        }
        self.get('auth').push(data)
        const ret = await req.make(ctx, '/users/' + self.get('id'), {
            method: 'PUT',
            auth: self.get('auth')
        })
        .then(response => response)
        .catch(reason => {
            console.error(reason)
            return reason
        })
        self.refresh()
        return ret
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
     * Возвращает массив всех пользователей в соответствии с текстовым запросом
     *
     * @param ctx - Контекст приложения
     * @param query - Текстовый запрос
     * @param opts - Опции поиска
     * @returns {Promise.<TResult>}
     */
    self.search = async (ctx, query, opts) => {
        opts = opts || {}
        return await req.make(ctx, '/users/search/' + query, {
            method: 'GET'
        }).then( async (response) => {
            let users = []
            if (!response || response.length === 0) {
                console.error(ctx, 'Нет пользователей')
                return null
            } else {
                for (let i = 0; i < response.length; i++) {
                    if (opts.skip_my !== true || response[i].id !== ctx.session.user.get('id')) {
                        users.push((new User()).set(response[i]))
                    }
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
    
    /**
     * Сохраняет объект в БД, апдейтя существующую запись
     *
     * @param ctx - Контекст приложения
     * @returns {Promise.<Goal>}
     */
    self.save = async(ctx) => {
        // Определяем данные для апдейта
        const data = self.get()
        
        await req.make(ctx, '/users/' + self.get('id'), Object.assign({}, self.get(), {
            method: 'PUT',
        })).then( response => {
            self.set(response)
        }).catch( reason => {
            console.error(reason)
            return false
        })
        
        return self
    }
    
    /**
     * Обновляет объект юзера в сессии по данным из БД
     *
     * @returns {Promise.<*>}
     */
    self.refresh = async(ctx) => {
        return self.findById(ctx, self.get('id'))
    }

    // Устанавливаем атрибуты модели, встроенные и переданные
    self.set(Object.assign({
        apiPath: '/users',
        id: null,
        createdAt: null,
        updatedAt: null,
        language: 'ru',
        username: '',
        email: '',
        password: '',
        auth: {},
        options: {},
        name: '',
        telegram_id: null
    }, data))
    
    return self
}

// Наследуемся от базовой модели
User.prototype = Object.create(Base.prototype)
User.prototype.constructor = Base

console.log('🔸️  User model initiated')

module.exports = User;
